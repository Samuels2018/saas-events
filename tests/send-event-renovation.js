const AWS = require('aws-sdk');
const { main, getOrder, getDetails, sendEmail } = require('..send-event-renovation/handler');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

// Mockear AWS SDK
jest.mock('aws-sdk', () => {
  const mockDynamoDB = {
    get: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  const mockSES = {
    sendEmail: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    config: {
      update: jest.fn()
    },
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB)
    },
    SES: jest.fn(() => mockSES),
    mockDynamoDB,
    mockSES
  };
});

describe('Configuration Tests', () => {
  beforeEach(() => {
    process.env.OFFLINE = 'true';
    process.env.TABLE_NAME = 'test-table';
    process.env.SOURCE_EMAIL = 'test@example.com';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should configure AWS for offline mode when OFFLINE is true', () => {
    require('./yourModule');
    expect(AWS.config.update).toHaveBeenCalledWith({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    });
  });

  test('should not configure AWS for offline mode when OFFLINE is false', () => {
    process.env.OFFLINE = 'false';
    require('./yourModule');
    expect(AWS.config.update).not.toHaveBeenCalled();
  });
});

describe('getOrder Function', () => {
  test('should retrieve an order successfully', async () => {
    const mockOrder = { orderId: '123', customerId: '456' };
    AWS.mockDynamoDB.promise.mockResolvedValueOnce({ Item: mockOrder });

    const result = await getOrder('123');
    expect(result).toEqual(mockOrder);
    expect(AWS.mockDynamoDB.get).toHaveBeenCalledWith({
      TableName: 'test-table',
      Key: { orderId: '123' }
    });
  });

  test('should throw error when DynamoDB fails', async () => {
    AWS.mockDynamoDB.promise.mockRejectedValueOnce(new Error('DB Error'));

    await expect(getOrder('123')).rejects.toThrow('Could not get order');
  });
});

describe('getDetails Function', () => {
  test('should retrieve customer details successfully', async () => {
    const mockCustomer = { customerId: '456', name: 'John Doe', email: 'john@example.com' };
    AWS.mockDynamoDB.promise.mockResolvedValueOnce({ Item: mockCustomer });

    const result = await getDetails('456');
    expect(result).toEqual(mockCustomer);
    expect(AWS.mockDynamoDB.get).toHaveBeenCalledWith({
      TableName: 'test-table',
      Key: { customerId: '456' }
    });
  });

  test('should throw error when DynamoDB fails', async () => {
    AWS.mockDynamoDB.promise.mockRejectedValueOnce(new Error('DB Error'));

    await expect(getDetails('456')).rejects.toThrow('Could not get details');
  });
});

describe('sendEmail Function', () => {
  test('should send email successfully', async () => {
    AWS.mockSES.promise.mockResolvedValueOnce({ MessageId: 'test-message-id' });
    const customer = { email: 'john@example.com', name: 'John Doe' };
    const order = { orderId: '123' };

    await sendEmail(customer, order);
    
    expect(AWS.mockSES.sendEmail).toHaveBeenCalledWith({
      Source: 'test@example.com',
      Destination: {
        ToAddresses: ['john@example.com']
      },
      Message: {
        Subject: {
          Data: 'Order Confirmation'
        },
        Body: {
          Text: {
            Data: 'Hello John Doe, your order 123 has been confirmed.'
          }
        }
      }
    });
  });

  test('should throw error when SES fails', async () => {
    AWS.mockSES.promise.mockRejectedValueOnce(new Error('SES Error'));
    const customer = { email: 'john@example.com', name: 'John Doe' };
    const order = { orderId: '123' };

    await expect(sendEmail(customer, order)).rejects.toThrow('Could not send email');
  });
});

describe('Main Function', () => {
  const mockEvent = {
    pathParameters: {
      orderId: '123'
    }
  };

  test('should process order successfully', async () => {
    const mockOrder = { orderId: '123', customerId: '456' };
    const mockCustomer = { customerId: '456', name: 'John', email: 'john@example.com' };
    
    AWS.mockDynamoDB.promise
      .mockResolvedValueOnce({ Item: mockOrder }) // getOrder
      .mockResolvedValueOnce({ Item: mockCustomer }); // getDetails
    
    AWS.mockSES.promise.mockResolvedValueOnce({}); // sendEmail

    const result = await main(mockEvent, {});

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email sent successfully',
        orderId: '123',
        customerId: '456'
      })
    });
  });

  test('should return 404 when order not found', async () => {
    AWS.mockDynamoDB.promise.mockResolvedValueOnce({ Item: undefined }); // getOrder

    const result = await main(mockEvent, {});

    expect(result).toEqual({
      statusCode: 404,
      body: JSON.stringify({ error: 'Order not found' })
    });
  });

  test('should return 404 when customer not found', async () => {
    const mockOrder = { orderId: '123', customerId: '456' };
    
    AWS.mockDynamoDB.promise
      .mockResolvedValueOnce({ Item: mockOrder }) // getOrder
      .mockResolvedValueOnce({ Item: undefined }); // getDetails

    const result = await main(mockEvent, {});

    expect(result).toEqual({
      statusCode: 404,
      body: JSON.stringify({ error: 'Customer not found' })
    });
  });

  test('should return 500 when unexpected error occurs', async () => {
    AWS.mockDynamoDB.promise.mockRejectedValueOnce(new Error('DB Error'));

    const result = await main(mockEvent, {});

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });
});