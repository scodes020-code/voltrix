
const fields = [

    "battery_capacity_kwh",
    "odometer_km",
    "vehicle_age_years",

    "cycle_count",

    "battery_health_percent",
    "state_of_charge",
    "depth_of_discharge",
    "state_of_health",

    "cell_voltage_avg",
    "cell_voltage_std",
    "pack_voltage",

    "cell_temperature_avg",
    "cell_temperature_max",

    "internal_resistance",

    "charge_efficiency",
    "discharge_efficiency",

    "remaining_capacity",
    "capacity_loss_percent",

    "charging_cycles_last_month",
    "fast_charge_ratio",
    "overcharge_events",

    "aggressive_acceleration_score",
    "hard_braking_score",

    "sensor_fault_count",
    "BMS_warning_count"

];


const sampleData = {

    battery_capacity_kwh: 75.35,

    odometer_km: 78919,

    vehicle_age_years: 6.34,

    cycle_count: 218,

    battery_health_percent: 91.12,

    state_of_charge: 54.94,

    depth_of_discharge: 38.28,

    state_of_health: 91.05,

    cell_voltage_avg: 3.3558,

    cell_voltage_std: 0.01606,

    pack_voltage: 811.58,

    cell_temperature_avg: 29.16,

    cell_temperature_max: 29.16,

    internal_resistance: 0.5409,

    charge_efficiency: 95.07,

    discharge_efficiency: 91.88,

    remaining_capacity: 67.19,

    capacity_loss_percent: 12.43,

    charging_cycles_last_month: 5.30,

    fast_charge_ratio: 0.34,

    overcharge_events: 0.58,

    aggressive_acceleration_score: 33.04,

    hard_braking_score: 23.76,

    sensor_fault_count: 1.32,

    BMS_warning_count: 2.02

};


const analyzeButton =
    document.getElementById("analyzeButton");

const sampleButton =
    document.getElementById("sampleButton");

const resetButton =
    document.getElementById("resetButton");


const resultEmpty =
    document.getElementById("resultEmpty");

const resultContent =
    document.getElementById("resultContent");

const probabilityElement =
    document.getElementById("probability");

const riskBadge =
    document.getElementById("riskBadge");

const meterFill =
    document.getElementById("meterFill");

const predictionTitle =
    document.getElementById("predictionTitle");

const predictionText =
    document.getElementById("predictionText");


const chargeStressDisplay =
    document.getElementById(
        "charge_stress_display"
    );


const usageIntensityDisplay =
    document.getElementById(
        "usage_intensity_display"
    );


// ============================================================
// INPUT HELPERS
// ============================================================

function getValue(id) {

    const element =
        document.getElementById(id);

    return Number(element.value);

}


function setValue(id, value) {

    document.getElementById(id).value =
        value;

}


// ============================================================
// ENGINEERED FEATURES
// ============================================================

function calculateDerivedFeatures() {

    const fastCharge =
        getValue("fast_charge_ratio");

    const overcharge =
        getValue("overcharge_events");

    const chargingCycles =
        getValue(
            "charging_cycles_last_month"
        );

    const stateOfCharge =
        getValue("state_of_charge");

    const depthOfDischarge =
        getValue("depth_of_discharge");


    const chargeStress =
        fastCharge *
        overcharge *
        chargingCycles;


    const usageIntensity =
        stateOfCharge *
        depthOfDischarge;


    chargeStressDisplay.textContent =
        Number.isFinite(chargeStress)
            ? chargeStress.toFixed(2)
            : "0.00";


    usageIntensityDisplay.textContent =
        Number.isFinite(usageIntensity)
            ? usageIntensity.toFixed(2)
            : "0.00";


    return {

        charge_stress_index:
            chargeStress,

        usage_intensity:
            usageIntensity

    };

}


// Update derived values whenever inputs change

fields.forEach(id => {

    const element =
        document.getElementById(id);

    element.addEventListener(
        "input",
        calculateDerivedFeatures
    );

});


// ============================================================
// LOAD SAMPLE
// ============================================================

sampleButton.addEventListener(
    "click",
    () => {

        fields.forEach(id => {

            if (
                sampleData[id] !== undefined
            ) {

                setValue(
                    id,
                    sampleData[id]
                );

            }

        });


        calculateDerivedFeatures();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


// ============================================================
// RESET
// ============================================================

resetButton.addEventListener(
    "click",
    () => {

        fields.forEach(id => {

            setValue(id, "");

        });


        chargeStressDisplay.textContent =
            "0.00";

        usageIntensityDisplay.textContent =
            "0.00";


        resultContent.classList.add(
            "hidden"
        );

        resultEmpty.classList.remove(
            "hidden"
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


// ============================================================
// COLLECT INPUT
// ============================================================

function collectInput() {

    const data = {};

    fields.forEach(id => {

        const value =
            getValue(id);

        if (!Number.isFinite(value)) {

            throw new Error(
                `Please enter a valid value for ${id.replaceAll("_", " ")}.`
            );

        }

        data[id] = value;

    });


    const derived =
        calculateDerivedFeatures();


    data.charge_stress_index =
        derived.charge_stress_index;


    data.usage_intensity =
        derived.usage_intensity;


    return data;

}


// ============================================================
// ANALYZE
// ============================================================

analyzeButton.addEventListener(
    "click",
    async () => {

        try {

            const data =
                collectInput();


            analyzeButton.disabled =
                true;

            analyzeButton.innerHTML =
                "Analyzing battery <span>...</span>";


            const response =
                await fetch(
                    "/api/predict",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(data)

                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.detail ||
                    "Prediction failed."
                );

            }


            displayResult(result);


        }

        catch (error) {

            alert(
                error.message
            );

        }

        finally {

            analyzeButton.disabled =
                false;

            analyzeButton.innerHTML =
                "Analyze Battery <span>→</span>";

        }

    }
);


// ============================================================
// DISPLAY RESULT
// ============================================================

function displayResult(result) {

    const probability =
        result.failure_probability;


    probabilityElement.textContent =
        `${probability.toFixed(1)}%`;


    meterFill.style.width =
        `${Math.min(probability, 100)}%`;


    riskBadge.textContent =
        `${result.risk_level} RISK`;


    if (
        result.risk_level === "LOW"
    ) {

        riskBadge.style.background =
            "#eaf8f1";

        riskBadge.style.color =
            "#159957";

        predictionTitle.textContent =
            "Battery appears to have low failure risk.";

        predictionText.textContent =
            "Voltrix predicts a relatively low probability of battery failure based on the supplied measurements.";

    }

    else if (
        result.risk_level === "MODERATE"
    ) {

        riskBadge.style.background =
            "#fff5df";

        riskBadge.style.color =
            "#b97700";

        predictionTitle.textContent =
            "Battery requires attention.";

        predictionText.textContent =
            "Voltrix identifies a moderate predicted probability of failure. Additional monitoring is recommended.";

    }

    else if (
        result.risk_level === "HIGH"
    ) {

        riskBadge.style.background =
            "#fff0e2";

        riskBadge.style.color =
            "#c26b00";

        predictionTitle.textContent =
            "Elevated battery failure risk.";

        predictionText.textContent =
            "Voltrix predicts an elevated probability of battery failure. Further diagnostic inspection is recommended.";

    }

    else {

        riskBadge.style.background =
            "#fdecec";

        riskBadge.style.color =
            "#c03939";

        predictionTitle.textContent =
            "Critical predicted failure risk.";

        predictionText.textContent =
            "Voltrix predicts a very high probability of battery failure. Professional battery diagnostics should be considered.";

    }


    resultEmpty.classList.add(
        "hidden"
    );

    resultContent.classList.remove(
        "hidden"
    );


    document
        .querySelector(".result-card")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}
