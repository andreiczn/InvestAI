import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import yfinance as yf


ticker = "GOOGL"
df = yf.download(ticker, period="6mo", interval="1d")  

print("Latest available data:")
print(df.tail())  


df = df[['Close']]


scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(df)

def create_sequences(data, seq_length):
    sequences, labels = [], []
    for i in range(len(data) - seq_length):
        sequences.append(data[i:i+seq_length])
        labels.append(data[i+seq_length])
    return np.array(sequences), np.array(labels)

seq_length = 60 
X, y = create_sequences(scaled_data, seq_length)


print(f"Preprocessed dataset shape: {X.shape}, {y.shape}")


model = tf.keras.models.load_model("lstm_model.h5")


predicted_prices = model.predict(X)
predicted_prices = scaler.inverse_transform(predicted_prices) 


plt.figure(figsize=(12, 6))
plt.plot(df.index[-len(y):], scaler.inverse_transform(y.reshape(-1,1)), label='Real Prices', color='blue')
plt.plot(df.index[-len(predicted_prices):], predicted_prices, label='Predicted Prices', color='red')
plt.xlabel('Date')
plt.ylabel('Stock Price')
plt.title(f'{ticker} Stock Price Prediction')
plt.legend()
plt.grid()
plt.show()

print("Historical predictions generated!")


future_predictions = []
current_input = X[-1].reshape(1, X.shape[1], 1)  

for _ in range(90):  
    next_pred = model.predict(current_input)
    future_predictions.append(next_pred[0][0])
    current_input = np.append(current_input[:, 1:, :], next_pred.reshape(1, 1, 1), axis=1)

future_predictions = scaler.inverse_transform(np.array(future_predictions).reshape(-1, 1))


future_start_date = df.index[-1] 
future_dates = pd.date_range(start=future_start_date, periods=91, freq='B')[1:]


plt.figure(figsize=(12, 6))
plt.plot(df.index[-len(y):], scaler.inverse_transform(y[-len(df.index[-100:]):].reshape(-1,1)), label='Real Prices', color='blue')
plt.plot(future_dates, future_predictions, label='Future Predictions', color='green', linestyle='dashed')
plt.xlabel('Date')
plt.ylabel('Stock Price')
plt.title(f'{ticker} Next 90 Days Prediction')
plt.legend()
plt.grid()
plt.show()

print("Future predictions for the next 90 days generated!")