import json
import yaml

with open('lib/api-spec/openapi.yaml', 'r') as f:
    text = f.read()

text = text.replace("? ''\n          : '#", "$ref: '#")
text = text.replace("? ''\n        : '#", "$ref: '#")
text = text.replace("? ''\n      : '#", "$ref: '#")
text = text.replace("? ''\n        : '#", "$ref: '#")
text = text.replace("? ''\n                    : '#", "$ref: '#")
text = text.replace("? ''\n                  : '#", "$ref: '#")
text = text.replace("- ? ''\n              : '#", "- $ref: '#")

with open('lib/api-spec/openapi.yaml', 'w') as f:
    f.write(text)
