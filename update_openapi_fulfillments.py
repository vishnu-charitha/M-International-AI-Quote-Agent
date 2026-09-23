import yaml

with open('lib/api-spec/openapi.yaml', 'r') as f:
    spec = yaml.safe_load(f)

# Add tags
if not any(t['name'] == 'fulfillments' for t in spec['tags']):
    spec['tags'].append({'name': 'fulfillments', 'description': 'Fulfillment and shipping operations'})

# Add FulfillmentStatus
if 'FulfillmentStatus' not in spec['components']['schemas']:
    spec['components']['schemas']['FulfillmentStatus'] = {
        'type': 'string',
        'enum': [
            'READY',
            'PICKING',
            'PACKED',
            'SHIPPED',
            'DELIVERED',
            'COMPLETED',
            'CANCELLED'
        ]
    }

# Add UpdateFulfillmentStatusInput
if 'UpdateFulfillmentStatusInput' not in spec['components']['schemas']:
    spec['components']['schemas']['UpdateFulfillmentStatusInput'] = {
        'type': 'object',
        'properties': {
            'status': {
                '': '#/components/schemas/FulfillmentStatus'
            },
            'carrier': {
                'type': 'string'
            },
            'trackingNumber': {
                'type': 'string'
            },
            'expectedShipDate': {
                'type': 'string',
                'format': 'date-time'
            }
        },
        'required': ['status']
    }

# Add Fulfillment
if 'Fulfillment' not in spec['components']['schemas']:
    spec['components']['schemas']['Fulfillment'] = {
        'type': 'object',
        'properties': {
            'id': {'type': 'integer'},
            'fulfillmentNumber': {'type': 'string'},
            'orderId': {'type': 'integer'},
            'invoiceId': {'type': 'integer'},
            'quoteId': {'type': 'integer', 'nullable': True},
            'rfqId': {'type': 'integer', 'nullable': True},
            'customer': {'type': 'string', 'nullable': True},
            'customerCompany': {'type': 'string', 'nullable': True},
            'partNumber': {'type': 'string'},
            'quantity': {'type': 'integer'},
            'status': {'': '#/components/schemas/FulfillmentStatus'},
            'warehouseLocation': {'type': 'string', 'nullable': True},
            'assignedTo': {'type': 'string', 'nullable': True},
            'trackingNumber': {'type': 'string', 'nullable': True},
            'carrier': {'type': 'string', 'nullable': True},
            'expectedShipDate': {'type': 'string', 'format': 'date-time', 'nullable': True},
            'shippedAt': {'type': 'string', 'format': 'date-time', 'nullable': True},
            'deliveredAt': {'type': 'string', 'format': 'date-time', 'nullable': True},
            'completedAt': {'type': 'string', 'format': 'date-time', 'nullable': True},
            'createdAt': {'type': 'string', 'format': 'date-time'},
            'updatedAt': {'type': 'string', 'format': 'date-time'}
        },
        'required': [
            'id', 'fulfillmentNumber', 'orderId', 'invoiceId', 'partNumber', 'quantity', 'status', 'createdAt', 'updatedAt'
        ]
    }

# Add history enums
enums = spec['components']['schemas']['ReviewHistoryEntry']['properties']['action']['enum']
for action in ['fulfillment_created', 'fulfillment_picking', 'fulfillment_packed', 'fulfillment_shipped', 'fulfillment_delivered', 'fulfillment_completed', 'fulfillment_cancelled']:
    if action not in enums:
        enums.append(action)

# Add parameters
if 'FulfillmentId' not in spec['components']['parameters']:
    spec['components']['parameters']['FulfillmentId'] = {
        'name': 'fulfillmentId',
        'in': 'path',
        'required': True,
        'schema': {
            'type': 'integer'
        }
    }

# Add paths
if '/fulfillments' not in spec['paths']:
    spec['paths']['/fulfillments'] = {
        'get': {
            'operationId': 'listFulfillments',
            'tags': ['fulfillments'],
            'summary': 'Get all fulfillments',
            'responses': {
                '200': {
                    'description': 'A list of fulfillments',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '': '#/components/schemas/Fulfillment'
                                }
                            }
                        }
                    }
                }
            }
        }
    }

if '/fulfillments/{fulfillmentId}' not in spec['paths']:
    spec['paths']['/fulfillments/{fulfillmentId}'] = {
        'get': {
            'operationId': 'getFulfillment',
            'tags': ['fulfillments'],
            'summary': 'Get fulfillment by ID',
            'parameters': [
                {'': '#/components/parameters/FulfillmentId'}
            ],
            'responses': {
                '200': {
                    'description': 'Fulfillment detail',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/Fulfillment'
                            }
                        }
                    }
                },
                '404': {
                    'description': 'Fulfillment not found',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/ErrorResponse'
                            }
                        }
                    }
                }
            }
        }
    }

if '/fulfillments/{fulfillmentId}/status' not in spec['paths']:
    spec['paths']['/fulfillments/{fulfillmentId}/status'] = {
        'post': {
            'operationId': 'updateFulfillmentStatus',
            'tags': ['fulfillments'],
            'summary': 'Update fulfillment status',
            'parameters': [
                {'': '#/components/parameters/FulfillmentId'}
            ],
            'requestBody': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {
                            '': '#/components/schemas/UpdateFulfillmentStatusInput'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Status updated',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/Fulfillment'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Invalid transition or missing info',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/ErrorResponse'
                            }
                        }
                    }
                }
            }
        }
    }

if '/orders/{orderId}/fulfillment' not in spec['paths']:
    spec['paths']['/orders/{orderId}/fulfillment'] = {
        'post': {
            'operationId': 'createFulfillment',
            'tags': ['fulfillments'],
            'summary': 'Create a fulfillment for an order',
            'parameters': [
                {'': '#/components/parameters/OrderId'}
            ],
            'responses': {
                '200': {
                    'description': 'Created fulfillment',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/Fulfillment'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Order not paid or fulfillment already exists',
                    'content': {
                        'application/json': {
                            'schema': {
                                '': '#/components/schemas/ErrorResponse'
                            }
                        }
                    }
                }
            }
        }
    }

with open('lib/api-spec/openapi.yaml', 'w') as f:
    yaml.dump(spec, f, sort_keys=False)
