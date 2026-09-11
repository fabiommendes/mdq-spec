"""
Convert questions to different formats.
"""

from .base import export_question, import_question, register_format

__all__ = ["import_question", "export_question"]


register_format("aiken", converter="mdq.convert.aiken:Aiken")
register_format("moodle-xml", converter="mdq.convert.moodle_xml:MoodleXml")
register_format("gift", converter="mdq.convert.gift:Gift")

del register_format
