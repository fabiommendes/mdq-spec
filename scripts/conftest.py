import sys
from pathlib import Path

# The scripts are not a package: make them importable by the tests.
sys.path.insert(0, str(Path(__file__).resolve().parent))
