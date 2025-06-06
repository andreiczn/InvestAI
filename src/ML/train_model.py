import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from data_loader import get_stock_data, preprocess_data

# 1. Încărcăm și preprocesăm datele
ticker = 'AAPL'
df = get_stock_data(ticker)
X, y, scaler = preprocess_data(df)

# 2. Împărțim datele în seturi de antrenare și test 
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# 3. Construim modelul cu Bidirectional LSTM
model = Sequential([
    Bidirectional(LSTM(units=64, return_sequences=True), input_shape=(X_train.shape[1], 1)),
    Dropout(0.3),
    Bidirectional(LSTM(units=64, return_sequences=False)),
    Dropout(0.3),
    Dense(units=32),
    Dense(units=1)
])

# 4. Compilăm modelul cu un learning rate mai mic
optimizer = Adam(learning_rate=0.0005)
model.compile(optimizer=optimizer, loss='mean_squared_error')

# 5. Antrenăm modelul
model.fit(X_train, y_train, epochs=50, batch_size=32, validation_data=(X_test, y_test))

# 6. Salvăm modelul antrenat
model.save("lstm_model.h5")
print("Modelul a fost antrenat și salvat cu succes!")
