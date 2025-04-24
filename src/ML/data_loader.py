import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import time
from sklearn.preprocessing import MinMaxScaler

def get_stock_data(ticker, start_date='2020-01-01', end_date='2024-01-01'):
    """Preia datele de la Yahoo Finance și le returnează sub formă de DataFrame, cu retry în caz de eșec."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            stock = yf.download(ticker, start=start_date, end=end_date, timeout=10)
            if not stock.empty:
                return stock[['Open', 'High', 'Low', 'Close', 'Volume']]
        except Exception as e:
            print(f"Eroare la descărcare a datelor pentru {ticker} (încercarea {attempt+1}): {e}")
            time.sleep(5)  # Așteaptă 5 secunde înainte de a încerca din nou
    raise ValueError(f"Eroare la descărcare a datelor pentru {ticker} după {max_retries} încercări.")

def preprocess_data(df):
    """Normalizează datele și creează seturile de antrenare/test pentru LSTM."""
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df['Close'].values.reshape(-1,1))
    
    X, y = [], []
    time_step = 60  # Vom folosi ultimele 60 de zile pentru a prezice următoarea zi
    for i in range(time_step, len(scaled_data)):
        X.append(scaled_data[i-time_step:i, 0])
        y.append(scaled_data[i, 0])
    
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    return X, y, scaler

def plot_stock_data(df, ticker):
    """Afișează un grafic cu evoluția prețului de închidere."""
    plt.figure(figsize=(12, 6))
    plt.plot(df.index, df['Close'], label=f'{ticker} Closing Price', color='blue')
    plt.xlabel('Date')
    plt.ylabel('Closing Price')
    plt.title(f'{ticker} Stock Price Over Time')
    plt.legend()
    plt.grid()
    plt.show()

if __name__ == "__main__":
    ticker = 'AAPL'  # Se poate schimba cu orice alt simbol de acțiune
    df = get_stock_data(ticker)
    print("Date inițiale:")
    print(df.head())
    
    X, y, scaler = preprocess_data(df)
    print("Forma setului de date preprocesat:", X.shape, y.shape)
    
    plot_stock_data(df, ticker)
