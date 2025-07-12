# InvestAI

## Aplicație pentru analiză și predicție financiară

---

## 1. Descriere

InvestAI este o aplicație web care permite:

- Vizualizarea prețurilor zilnice ale **acțiunilor** și **criptomonedelor**  
- Generarea predicțiilor pe baza unui model LSTM (Python + Keras)  
- Calcularea unui **Risk Score** folosind analiza de sentiment, volatilitate și trend  
- Autentificare, stocare date și chat în timp real cu **Firebase Authentication** & **Firestore**  

---

## 2. Cerințe de sistem

1. **Git**  
2. **Node.js** (≥ 18.x) și **npm** (≥ 9.x)  
   - Descarcă: https://nodejs.org → alege LTS  
3. **Python** (≥ 3.10) și **pip**  
   - Descarcă: https://www.python.org/downloads/  
4. **Visual Studio Code** (sau alt editor preferat)  

---

## 3. Clonare proiect

Deschideți un terminal și rulați:

```bash
# HTTPS
git clone https://gitlab.dev.info.uvt.ro/didactic/2025/licenta/ir/licentaandreiicazan2025.git

# sau SSH
git clone git@gitlab.dev.info.uvt.ro:didactic/2025/licenta/ir/licentaandreiicazan2025.git

ulterior -> cd licentaandreiicazan2025
```
--- 

## 4. Configurare variabile de mediu

1. În root-ul proiectului, creați un nou fișier, numit .env.local. Acest fișier va conține toate cheile API, id-urile și informațiile necesare pentru rularea proiectului.
2. Copiați următorul conținut:
```
# — API keys —
VITE_ALPHA_VANTAGE_KEY=YOUR_ALPHA_VANTAGE_KEY
VITE_COINGECKO_KEY=YOUR_COINGECKO_KEY
VITE_MARKETAUX_KEY=YOUR_MARKETAUX_KEY

# — Backend FastAPI —
VITE_BACKEND_URL=http://localhost:8000

# — Firebase Web SDK —
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```
## 5. Obținere chei API

5.1 Alpha Vantage (date pt piața de acțiuni)

- Accesați https://www.alphavantage.co/support/#api-key

- Înregistrați-vă gratuit cu email

- Copiați cheia API în VITE_ALPHA_VANTAGE_KEY

5.2 CoinGecko (date cripto)

- Accesați https://www.coingecko.com/en/api

- Selectați „API” → creați un cont demo

- Copiați cheia în VITE_COINGECKO_KEY

5.3 MarketAux (știri financiare)

- Accesați https://www.marketaux.com

- Înregistrați-vă și obțineți token API

- Copiați-l în VITE_MARKETAUX_KEY


## 6. Configurare Firebase & Firestore

6.1 Creare proiect Firebase
- Accesați https://console.firebase.google.com

- Apăsați Add project, urmați pașii, dezactivați Analytics (opțional)

6.2 Adăugare aplicație Web
- În Project settings → General → Your apps → Add app → Web

- Denumiți-o „InvestAI”

- Preluați configurația furnizată și copiați-o în .env.local

6.3 Autentificare Google
- În consola Firebase → Authentication → Sign-in method

- Activați Google și salvați

6.4 Activare Firestore

- În consola Firebase → Firestore Database → Create database

- Alegeți modul Production, regiunea cea mai apropiată


6.5 Creare colecții

În Firestore, creați următoarele colecții (fără documente inițiale):

- users

- messages

Aplicația va genera automat elemente pentru aceste două colecții, pe măsură ce se adaugă utilizatori noi, respectiv pe măsură ce se efectuează schimburi de mesaje.

## 7. Instalare și rulare backend (FastAPI + ML)

- Configurare mediu Python
```
cd src/ML

# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

- Fișierul requirements.txt conține toate pachetele ce necesită instalare
```
pip install -r requirements.txt  
```
- Antrenați modelul
```
python train_model.py
```
- Pornire server FastAPI
```
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
- Verificați Swagger UI: http://localhost:8000/docs

## 8. Instalare și rulare frontend (React + Vite)

În rădăcina proiectului, rulați comenzile:
- npm install
- npm run dev

Accesați: http://localhost:5173


Acum, aplicația ar trebui să fie funcțională. Pentru un ghid detaliat al utilizării, consultați capitolul 3.3 al lucrării scrise.



