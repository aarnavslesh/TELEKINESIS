# Cisco IOS Security Command Classifier

This project is a small local AI fallback module for an air-gapped network security compliance auditor. When a deterministic parser cannot recognize a Cisco IOS command, this classifier predicts one of these 9 security categories:

`SSH Config`, `Password Policy`, `Access Control`, `Logging`, `Banner`, `Interface`, `NTP`, `AAA`, `VLAN`

The pipeline uses `setfit`, a few-shot text classification library. It does not use OpenAI, Ollama, or any external generative LLM API.

## Files

- `dataset.csv`: synthetic Cisco IOS command examples with labels
- `train.py`: trains the SetFit classifier and saves it locally
- `app.py`: FastAPI service with a `/predict` endpoint
- `requirements.txt`: Python packages needed to run the project

## Important Offline Note

The code runs locally on CPU. `train.py` uses `local_files_only=True`, so it will not try to download the base model from the internet.

Before running training, `BAAI/bge-small-en-v1.5` must already be available in the machine's Hugging Face cache or in a local model mirror. In a true air-gapped environment, download and approve the base model on a connected staging machine first, then copy the cached model files into the offline environment.

After the base model and Python packages are installed locally, training and prediction do not require an internet connection.

## Step 1: Create a Virtual Environment

Open a terminal in this project directory.

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

You should now see `(.venv)` at the start of your terminal prompt.

## Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:

- `setfit` for few-shot classification
- `datasets` for train/test dataset handling
- `pandas` for reading the CSV file
- `fastapi` and `uvicorn` for the prediction API
- `pydantic` for request and response validation

## Step 3: Train the Classifier

```bash
python train.py
```

What happens during training:

1. `train.py` reads `dataset.csv`.
2. It splits the examples into training and test sets.
3. It fine-tunes `BAAI/bge-small-en-v1.5` using `SetFitTrainer`.
4. It prints a simple accuracy result.
5. It saves the trained model into `./cisco-classifier-model`.

Training is designed for CPU use, but exact runtime depends on the machine.

## Step 4: Start the FastAPI Server

```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

Keep this terminal running. The API is now available at:

```text
http://127.0.0.1:8000
```

## Step 5: Send a Prediction Request

Open a second terminal and run:

```bash
curl -X POST "http://127.0.0.1:8000/predict" ^
  -H "Content-Type: application/json" ^
  -d "{\"command\":\"logg trap informational\"}"
```

On macOS or Linux, use:

```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"command":"logg trap informational"}'
```

Example response:

```json
{
  "category": "Logging",
  "confidence": 0.91
}
```

The exact confidence value may differ after training.

## API Reference

### POST `/predict`

Request body:

```json
{
  "command": "raw cli text"
}
```

Response body:

```json
{
  "category": "Logging",
  "confidence": 0.91
}
```

## Dataset Format

`dataset.csv` has two columns:

- `text`: the raw Cisco IOS command
- `label`: one of the 9 exact categories

The seed data intentionally includes normal commands, shorthand commands, typos, and legacy-style syntax so the model can learn the kinds of imperfect input it will see when the deterministic parser fails.

## Improving Accuracy Later

For production use, add real parser failures to `dataset.csv` over time. The most useful examples are commands that are close to valid Cisco IOS syntax but currently confuse the deterministic parser.
