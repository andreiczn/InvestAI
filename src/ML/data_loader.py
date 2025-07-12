import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import time
from sklearn.preprocessing import MinMaxScaler

def get_stock_data(ticker, start_date='2020-01-01', end_date='2024-01-01'):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # fetch data from yfinance
            stock = yf.download(ticker, start=start_date, end=end_date, timeout=10)
            if not stock.empty:
                return stock[['Open', 'High', 'Low', 'Close', 'Volume']]  # return selected cols
        except Exception as e:
            print(f"Error downloading data for {ticker} (attempt {attempt+1}): {e}")
            time.sleep(5)  # wait before retry
    raise ValueError(f"Failed to download data for {ticker} after {max_retries} attempts.")  # raise if all attempts fail

def preprocess_data(df):
  
    # scale close prices and create time-series sequences
    scaler = MinMaxScaler(feature_range=(0, 1))  # min-max scaling
    scaled_data = scaler.fit_transform(df['Close'].values.reshape(-1, 1))
    
    X, y = [], []
    time_step = 60  # sequence length for LSTM
    for i in range(time_step, len(scaled_data)):
        X.append(scaled_data[i-time_step:i, 0])  # input sequence
        y.append(scaled_data[i, 0])  # target value
    
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))  # add feature dimension
    
    return X, y, scaler  # return sequences and scaler
def plot_stock_data(df, ticker):
    plt.figure(figsize=(12, 6))
    plt.plot(df.index, df['Close'], label=f'{ticker} Closing Price')  # plot line
    plt.xlabel('Date')  # x-axis label
    plt.ylabel('Closing Price')  # y-axis label
    plt.title(f'{ticker} Stock Price Over Time')  # plot title
    plt.legend()  # show legend
    plt.grid()  # enable grid
    plt.show()  # display plot

if __name__ == "__main__":
    ticker = 'AAPL'  # default ticker
    df = get_stock_data(ticker)  # download data
    print("Initial data:")
    print(df.head())  # show first rows
    
    X, y, scaler = preprocess_data(df)  # prepare data
    print("Preprocessed dataset shape:", X.shape, y.shape)  # debug shapes
    
    plot_stock_data(df, ticker)  # visualize closing prices

