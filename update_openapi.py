import yaml

with open('lib/api-spec/openapi.yaml', 'r') as f:
    spec = yaml.safe_load(f)

# Add tags
if 'tags' not in spec:
    spec['tags'] = []
if not any(t['name'] == 'invoices' for t in spec['tags']):
    spec['tags'].append({'name': 'invoices', 'description': 'Invoice and billing operations'})

# Add paths
paths = spec.get('paths', {})

paths['/invoices'] = {
    'get': {
        'operationId': 'listInvoices',
        'tags': ['invoices'],
        'summary': 'List all invoices',
        'responses': {
            '200': {
                'description': 'A list of invoices',
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'array',
                            'items': {'$ref': '#/components/schemas/Invoice'}
                        }
                    }
                }
            }
        }
    }
}

paths['/invoices/{invoiceId}'] = {
    'get': {
        'operationId': 'getInvoice',
        'tags': ['invoices'],
        'summary': 'Get invoice details',
        'parameters': [
            {
                'name': 'invoiceId',
                'in': 'path',
                'required': True,
                'schema': {'type': 'integer'}
            }
        ],
        'responses': {
            '200': {
                'description': 'Invoice details',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/Invoice'}
                    }
                }
            },
            '404': {
                'description': 'Invoice not found',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/ErrorResponse'}
                    }
                }
            }
        }
    }
}

paths['/orders/{orderId}/invoices'] = {
    'post': {
        'operationId': 'createInvoice',
        'tags': ['invoices'],
        'summary': 'Create an invoice for an order',
        'parameters': [
            {
                'name': 'orderId',
                'in': 'path',
                'required': True,
                'schema': {'type': 'integer'}
            }
        ],
        'responses': {
            '200': {
                'description': 'Created invoice',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/Invoice'}
                    }
                }
            },
            '400': {
                'description': 'Validation or creation error',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/ErrorResponse'}
                    }
                }
            },
            '404': {
                'description': 'Order not found',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/ErrorResponse'}
                    }
                }
            }
        }
    }
}

paths['/invoices/{invoiceId}/issue'] = {
    'post': {
        'operationId': 'issueInvoice',
        'tags': ['invoices'],
        'summary': 'Issue a draft invoice',
        'parameters': [
            {
                'name': 'invoiceId',
                'in': 'path',
                'required': True,
                'schema': {'type': 'integer'}
            }
        ],
        'responses': {
            '200': {
                'description': 'Issued invoice',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/Invoice'}
                    }
                }
            },
            '400': {
                'description': 'Validation or transition error',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/ErrorResponse'}
                    }
                }
            }
        }
    }
}

paths['/invoices/{invoiceId}/payment'] = {
    'post': {
        'operationId': 'processInvoicePayment',
        'tags': ['invoices'],
        'summary': 'Simulate payment for an invoice',
        'parameters': [
            {
                'name': 'invoiceId',
                'in': 'path',
                'required': True,
                'schema': {'type': 'integer'}
            }
        ],
        'requestBody': {
            'required': True,
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'action': {'type': 'string', 'enum': ['PAID']}
                        },
                        'required': ['action']
                    }
                }
            }
        },
        'responses': {
            '200': {
                'description': 'Payment processed',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/Invoice'}
                    }
                }
            }
        }
    }
}

spec['paths'] = paths

# Add schemas
schemas = spec['components']['schemas']

schemas['InvoiceStatus'] = {
    'type': 'string',
    'enum': ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']
}

schemas['PaymentStatus'] = {
    'type': 'string',
    'enum': ['UNPAID', 'PAID', 'OVERDUE']
}

schemas['Invoice'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'integer'},
        'invoiceNumber': {'type': 'string'},
        'orderId': {'type': 'integer'},
        'quoteId': {'type': 'integer', 'nullable': True},
        'rfqId': {'type': 'integer', 'nullable': True},
        'customer': {'type': 'string', 'nullable': True},
        'customerCompany': {'type': 'string', 'nullable': True},
        'customerEmail': {'type': 'string', 'nullable': True},
        'partNumber': {'type': 'string'},
        'quantity': {'type': 'integer'},
        'unitPrice': {'type': 'string', 'nullable': True},
        'subtotal': {'type': 'string', 'nullable': True},
        'tax': {'type': 'string', 'nullable': True},
        'totalAmount': {'type': 'string'},
        'currency': {'type': 'string'},
        'invoiceDate': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'dueDate': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'status': {'$ref': '#/components/schemas/InvoiceStatus'},
        'paymentStatus': {'$ref': '#/components/schemas/PaymentStatus'},
        'createdAt': {'type': 'string', 'format': 'date-time'},
        'updatedAt': {'type': 'string', 'format': 'date-time'}
    },
    'required': ['id', 'invoiceNumber', 'orderId', 'partNumber', 'quantity', 'totalAmount', 'currency', 'status', 'paymentStatus', 'createdAt', 'updatedAt']
}

# Update ReviewHistoryEntry actions
if 'ReviewHistoryEntry' in schemas:
    enum_list = schemas['ReviewHistoryEntry']['properties']['action']['enum']
    if 'invoice_created' not in enum_list:
        enum_list.extend(['invoice_created', 'invoice_issued', 'invoice_paid'])

with open('lib/api-spec/openapi.yaml', 'w') as f:
    yaml.dump(spec, f, sort_keys=False)
