import os
import boto3
from datetime import datetime, timedelta
from email.mime.text import MIMEText
import smtplib

def get_subscription() -> dict:
    
  dynamo = boto3.resource('dynamodb')

  IS_OFFLINE = os.environ.get('IS_OFFLINE', False)
  if IS_OFFLINE:
    boto3.Session(
      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    dynamo = boto3.resource('dynamodb', endpoint_url='http://localhost:8000')

  table = dynamo.Table(os.environ['DYNAMO_TABLE'])


  expiration = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S')
  response = table.scan(
    FilterExpression='expirationDate = :date AND active = :active',
    ExpressionAttributeValues={
      'datate': expiration,
      ':active': True
    }
  )

  return response.get('Items', [])

def send_email_reminder (subscription: dict) -> None:

  sender = os.environ['SENDER']
  recipient = subscription['email']
  subject = "Subscription Reminder"

  body = f"""
    Hola {subscription['customerName']},
    
    Tu suscripción a {subscription['productName']} está por expirar el {subscription['expirationDate']}.
    
    Por favor renueva tu suscripción para continuar disfrutando del servicio.
    
    Saludos,
    El equipo de soporte
  """

  ses = boto3.client('ses')

  ses.send_email(
    Source=sender,
    Destination={
      'ToAddresses': [recipient]
    },
    Message={
      'Subject': {
        'Data': subject
      },
      'Body': {
        'Text': {
          'Data': body
        }
      }
    }
  )

def main(event, context) -> dict:
  subscriptions = get_subscription()

  for subscription in subscriptions:
    send_email_reminder(subscription)

  return {
    'statusCode': 200,
    'body': 'Emails sent successfully'
  }