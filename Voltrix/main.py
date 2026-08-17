
from pathlib import Path
import json

import joblib
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel

from tensorflow import keras


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "model"
STATIC_DIR = BASE_DIR / "static"

MODEL_PATH = MODEL_DIR / "voltrix_battery_model_v2.keras"
SCALER_PATH = MODEL_DIR / "scaler2.joblib"
CONFIG_PATH = MODEL_DIR / "feature_config.json"


# ============================================================
# LOAD MODEL
# ============================================================

model = keras.models.load_model(
    MODEL_PATH,
    compile=False
)

scaler = joblib.load(
    SCALER_PATH
)

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)


FEATURES = config["features"]

THRESHOLD = config.get(
    "threshold",
    0.30
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Voltrix",
    description="EV Battery Failure Prediction API",
    version="1.0.0"
)


# ============================================================
# REQUEST MODEL
# ============================================================

class BatteryInput(BaseModel):

    battery_capacity_kwh: float
    odometer_km: float
    vehicle_age_years: float

    cycle_count: float

    battery_health_percent: float
    state_of_charge: float
    depth_of_discharge: float
    state_of_health: float

    cell_voltage_avg: float
    cell_voltage_std: float
    pack_voltage: float

    cell_temperature_avg: float
    cell_temperature_max: float

    internal_resistance: float

    charge_efficiency: float
    discharge_efficiency: float

    remaining_capacity: float
    capacity_loss_percent: float

    charging_cycles_last_month: float
    fast_charge_ratio: float
    overcharge_events: float

    aggressive_acceleration_score: float
    hard_braking_score: float

    sensor_fault_count: float
    BMS_warning_count: float

    charge_stress_index: float
    usage_intensity: float


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "Voltrix",
        "model": "voltrix_battery_model_v2"
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/api/model-info")
def model_info():

    return {
        "model": "Voltrix Neural Network v2",
        "features": FEATURES,
        "feature_count": len(FEATURES),
        "failure_threshold": THRESHOLD
    }


# ============================================================
# PREDICTION
# ============================================================

@app.post("/api/predict")
def predict(data: BatteryInput):

    try:

        values = data.model_dump()

        # Ensure exact feature order
        input_values = [
            values[feature]
            for feature in FEATURES
        ]

        X = np.array(
            [input_values],
            dtype=np.float32
        )

        # Apply SAME RobustScaler used during training
        X_scaled = scaler.transform(X)

        # Neural network prediction
        probability = float(
            model.predict(
                X_scaled,
                verbose=0
            )[0][0]
        )

        # Classification
        prediction = int(
            probability >= THRESHOLD
        )

        # Risk level for UI
        if probability < 0.30:

            risk = "LOW"

        elif probability < 0.60:

            risk = "MODERATE"

        elif probability < 0.80:

            risk = "HIGH"

        else:

            risk = "CRITICAL"


        return {

            "success": True,

            "failure_probability": round(
                probability * 100,
                2
            ),

            "prediction": prediction,

            "failure_detected": bool(
                prediction
            ),

            "risk_level": risk,

            "threshold": THRESHOLD

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# FRONTEND
# ============================================================

app.mount(
    "/static",
    StaticFiles(
        directory=STATIC_DIR
    ),
    name="static"
)


@app.get("/")
def home():

    return FileResponse(
        STATIC_DIR / "index.html"
    )
