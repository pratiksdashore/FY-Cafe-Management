import sys
import pickle
import numpy as np
import os

# Set base path to the directory where the script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "xgboost_food_model.pkl")

def predict():
    if len(sys.argv) < 7:
        print("Error: Expected 6 binary features as arguments.")
        sys.exit(1)

    try:
        features = [int(x) for x in sys.argv[1:7]]
        
        if not os.path.exists(MODEL_PATH):
            print(f"Error: Model file not found at {MODEL_PATH}")
            sys.exit(1)

        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)

        input_array = np.array(features).reshape(1, -1)
        prediction = model.predict(input_array)
        
        # Safely convert to integer
        # Handling potential dimensionality like [[0]] or [0]
        if hasattr(prediction, "__iter__"):
            res = prediction.flatten()[0]
        else:
            res = prediction

        print(int(res))

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    predict()
