import yaml

with open('lib/api-spec/openapi.yaml', 'r') as f:
    spec = yaml.safe_load(f)

# Replace inline body with ref
spec['paths']['/invoices/{invoiceId}/payment']['post']['requestBody']['content']['application/json']['schema'] = {
    '$ref': '#/components/schemas/ProcessInvoicePaymentInput'
}

# Add schema
spec['components']['schemas']['ProcessInvoicePaymentInput'] = {
    'type': 'object',
    'properties': {
        'action': {
            'type': 'string',
            'enum': ['PAID']
        }
    },
    'required': ['action']
}

with open('lib/api-spec/openapi.yaml', 'w') as f:
    yaml.dump(spec, f, sort_keys=False)
