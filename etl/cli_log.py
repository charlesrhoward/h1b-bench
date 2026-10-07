"""Logging setup shared by the ETL scripts.

Messages go to stdout as plain text, one line per record, the same output the scripts
printed before. Each module logs through `logging.getLogger(__name__)`.
"""
import logging
import sys


def configure_logging():
    """Send INFO and above to stdout without level or timestamp prefixes."""
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
