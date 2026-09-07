"""
Fine-tune a local SetFit text classifier for Cisco IOS command categorization.

This script intentionally keeps the training workflow small and readable:
1. Load the synthetic seed examples from dataset.csv.
2. Split them into training and test rows.
3. Fine-tune BAAI/bge-small-en-v1.5 with SetFit.
4. Save the trained model to ./cisco-classifier-model.

No OpenAI, Ollama, or remote generative LLM APIs are used. The only model is a
local Hugging Face sentence-transformer model used through the SetFit library.
"""

from pathlib import Path

import pandas as pd
from datasets import Dataset
from setfit import SetFitModel, SetFitTrainer


# Keep paths in one place so beginners can see exactly where files are read
# from and where the trained model will be written.
DATASET_PATH = Path("dataset.csv")
MODEL_OUTPUT_DIR = Path("cisco-classifier-model")
BASE_MODEL_NAME = "BAAI/bge-small-en-v1.5"


def standardize_dataframe_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Normalize CSV headers so SetFit always receives text and label columns."""
    dataframe = dataframe.copy()

    # Strip hidden whitespace, tabs, and newlines from headers immediately after
    # reading the CSV. astype(str) keeps this safe even if a header is not text.
    dataframe.columns = dataframe.columns.astype(str).str.strip()

    normalized_columns = {
        column: column.strip().lower().replace(" ", "").replace("_", "")
        for column in dataframe.columns
    }

    rename_map = {}
    for column, normalized in normalized_columns.items():
        if normalized == "text":
            rename_map[column] = "text"
        elif normalized == "label":
            rename_map[column] = "label"

    dataframe = dataframe.rename(columns=rename_map)

    # Final safeguard for two-column CSVs whose headers were generated with
    # unexpected names. This keeps the training pipeline strict about the final
    # schema without changing the model logic.
    if {"text", "label"}.difference(dataframe.columns) and len(dataframe.columns) >= 2:
        dataframe = dataframe.rename(
            columns={
                dataframe.columns[0]: "text",
                dataframe.columns[1]: "label",
            }
        )

    return dataframe


def load_dataset() -> Dataset:
    """Load dataset.csv and convert it into a Hugging Face Dataset.

    SetFit expects a dataset object with at least:
    - a text column containing the raw command
    - a label column containing the target category
    """
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            "dataset.csv was not found. Make sure you run this script from the "
            "project root directory."
        )

    dataframe = pd.read_csv(DATASET_PATH)
    dataframe = standardize_dataframe_columns(dataframe)

    # Basic validation catches common CSV editing mistakes early, before the
    # training library produces a less obvious error message.
    required_columns = {"text", "label"}
    missing_columns = required_columns.difference(dataframe.columns)
    if missing_columns:
        raise ValueError(f"dataset.csv is missing required columns: {missing_columns}")

    if dataframe.empty:
        raise ValueError("dataset.csv is empty. Add labeled command examples first.")

    return Dataset.from_pandas(dataframe, preserve_index=False)


def split_examples(full_dataset: Dataset) -> tuple[Dataset, Dataset]:
    """Create a small, label-balanced train/test split safely."""
    df = full_dataset.to_pandas()
    
    # Shuffle all rows to ensure randomness
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Grab the first occurrence of each category for the test set
    test_rows = df.drop_duplicates(subset=["label"])
    
    # Use the remaining rows for the training set
    train_rows = df.drop(test_rows.index)
    
    return (
        Dataset.from_pandas(train_rows, preserve_index=False),
        Dataset.from_pandas(test_rows, preserve_index=False),
    )


def main() -> None:
    """Train and save the SetFit model."""
    full_dataset = load_dataset()

    train_dataset, test_dataset = split_examples(full_dataset)

    # SetFit uses a sentence-transformer encoder plus a lightweight classifier
    # head. BAAI/bge-small-en-v1.5 is small enough for CPU fine-tuning on a
    # modest machine while still producing strong sentence embeddings.
    model = SetFitModel.from_pretrained(BASE_MODEL_NAME, local_files_only=False)

    # SetFitTrainer performs contrastive fine-tuning from a small number of
    # labeled examples, then trains the final classifier head.
    trainer = SetFitTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
        metric="accuracy",
        batch_size=8,
        num_iterations=20,
        num_epochs=1,
        column_mapping={
            "text": "text",
            "label": "label",
        },
    )

    print("Starting SetFit fine-tuning...")
    trainer.train()

    print("Evaluating on the held-out test split...")
    metrics = trainer.evaluate()
    print(f"Evaluation metrics: {metrics}")

    # save_pretrained writes all files needed to load the classifier later
    # without retraining.
    MODEL_OUTPUT_DIR.mkdir(exist_ok=True)
    trainer.model.save_pretrained(str(MODEL_OUTPUT_DIR))
    print(f"Saved fine-tuned model to: {MODEL_OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()