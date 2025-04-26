const AWS = require('aws-sdk')
const ses = new AWS.SES()
const dynamoDB = new AWS.DynamoDB.DocumentClient()

OFFLINE = process.env.OFFLINE
if (OFFLINE) {
  AWS.config.update({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  })
}

const main = async (event, ctx) => {
  try {
    const orderId = event.pathParameters.orderId
    const order = await getOrder(orderId)
    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' })
      }
    }

    const customer = await getDetails(order.customerId)

    if (!customer) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Customer not found' })
      }
    }

    await sendEmail(customer, order)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email sent successfully',
        orderId: orderId,
        customerId: order.customerId
      })
    }
  }catch (err) {
    console.error('Error in main function:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}

async function getOrder (orderId) {
  const paramas = {
    TableName: process.env.TABLE_NAME,
    Key: {
      orderId: orderId
    }
  }

  try {
    const res = await dynamoDB.get(paramas).promise()
    return res.Item
  }catch (err) {
    console.error('Error getting order:', err)
    throw new Error('Could not get order')
  }
}

async function getDetails (customerId) {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      customerId: customerId
    }
  }

  try {
    const res = await dynamoDB.get(params).promise()
    return res.Item
  }catch (err) {
    console.error('Error getting details:', err)
    throw new Error('Could not get details')
  }
}

async function sendEmail (customer, order) {
  const params = {
    Source: process.env.SOURCE_EMAIL,
    Detination: {
      ToAddresses: [customer.email]
    },
    Message: {
      Subject: {
        Data: 'Order Confirmation'
      },
      Body: {
        Text: {
          Data: `Hello ${customer.name}, your order ${order.orderId} has been confirmed.`
        }
      }
    }
  }

  try {
    await ses.sendEmail(params).promise()
    console.log('Email sent successfully')
  } catch (err) {
    console.error('Error sending email:', err)
    throw new Error('Could not send email')
  }
}