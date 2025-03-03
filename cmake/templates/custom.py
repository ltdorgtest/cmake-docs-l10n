import json
import os

# Default configuration values
DEFAULT_CONFIG_VALUES = {
    "enable_switchers"  : 0,
    "current_version"   : "",
    "current_language"  : "",
    "html_baseurl"      : "",
}

# Custom html_theme_options
CUSTOM_HTML_THEME_OPTIONS = {
    'footerbgcolor':    '#00182d',
    'footertextcolor':  '#ffffff',
    'sidebarbgcolor':   '#e4ece8',
    'sidebarbtncolor':  '#00a94f',
    'sidebartextcolor': '#333333',
    'sidebarlinkcolor': '#00a94f',
    'relbarbgcolor':    '#00529b',
    'relbartextcolor':  '#ffffff',
    'relbarlinkcolor':  '#ffffff',
    'bgcolor':          '#ffffff',
    'textcolor':        '#444444',
    'headbgcolor':      '#f2f2f2',
    'headtextcolor':    '#003564',
    'headlinkcolor':    '#3d8ff2',
    'linkcolor':        '#2b63a8',
    'visitedlinkcolor': '#2b63a8',
    'codebgcolor':      '#eeeeee',
    'codetextcolor':    '#333333',
}

def add_default_config_values(app):
    """
    Add default configuration values to the Sphinx app if not already defined.
    """
    for key, default in DEFAULT_CONFIG_VALUES.items():
        if key not in app.config.values:
            app.add_config_value(key, default, "env")

def configure_html_context(app):
    """
    Configure the html_context with necessary switchers, base URL,
    current version, and current language for Sphinx HTML output.
    """
    for key in DEFAULT_CONFIG_VALUES.keys():
        app.config.html_context[key] = getattr(app.config, key, "")

def setup(app):
    """
    Sphinx extension entry point.
    """
    add_default_config_values(app)

    # Clear the existing html_theme_options
    app.config.html_theme_options = {}

    # Set the custom theme options
    app.config.html_theme_options.update(CUSTOM_HTML_THEME_OPTIONS)

    # Connect to the builder-inited event to configure the HTML context
    app.connect("builder-inited", configure_html_context)

    return {
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
