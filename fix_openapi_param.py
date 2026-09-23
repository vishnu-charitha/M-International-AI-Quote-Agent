import json
import yaml

with open('lib/api-spec/openapi.yaml', 'r') as f:
    spec = yaml.safe_load(f)

# The parameter might just be a dict instead of a ref
spec['paths']['/orders/{orderId}/fulfillment']['post']['parameters'] = [
    {
        'name': 'orderId',
        'in': 'path',
        'required': True,
        'schema': {
            'type': 'integer'
        }
    }
]

with open('lib/api-spec/openapi.yaml', 'w') as f:
    yaml.dump(spec, f, sort_keys=False)
