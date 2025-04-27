import unittest
import os
import boto3
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from ..send_event_email.handler import get_subscription, send_email_reminder, main

class TestSubscriptionFunctions(unittest.TestCase):
    
    @patch.dict('os.environ', {
        'DYNAMO_TABLE': 'test_table',
        'IS_OFFLINE': 'True',
        'AWS_ACCESS_KEY_ID': 'test_key',
        'AWS_SECRET_ACCESS_KEY': 'test_secret'
    })
    @patch('boto3.resource')
    def test_get_subscription_offline(self, mock_boto3):
        # Configurar mocks
        mock_table = MagicMock()
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        
        mock_boto3.return_value = mock_dynamo
        
        # Configurar respuesta simulada de DynamoDB
        expected_items = [
            {
                'email': 'test@example.com',
                'customerName': 'Test User',
                'productName': 'Test Product',
                'expirationDate': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S'),
                'active': True
            }
        ]
        mock_table.scan.return_value = {'Items': expected_items}
        
        # Ejecutar función
        result = get_subscription()
        
        # Verificar resultados
        self.assertEqual(result, expected_items)
        mock_boto3.assert_called_with('dynamodb', endpoint_url='http://localhost:8000')
        mock_table.scan.assert_called_once_with(
            FilterExpression='expirationDate = :date AND active = :active',
            ExpressionAttributeValues={
                ':date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S'),
                ':active': True
            }
        )

    @patch.dict('os.environ', {'DYNAMO_TABLE': 'test_table'})
    @patch('boto3.resource')
    def test_get_subscription_online(self, mock_boto3):
        # Configurar mocks
        mock_table = MagicMock()
        mock_dynamo = MagicMock()
        mock_dynamo.Table.return_value = mock_table
        mock_boto3.return_value = mock_dynamo
        
        # Ejecutar función
        get_subscription()
        
        # Verificar que se usó la conexión normal (no offline)
        mock_boto3.assert_called_with('dynamodb')

    @patch.dict('os.environ', {'SENDER': 'sender@example.com'})
    @patch('boto3.client')
    def test_send_email_reminder(self, mock_boto3):
        # Configurar mock de SES
        mock_ses = MagicMock()
        mock_boto3.return_value = mock_ses
        
        # Datos de prueba
        test_subscription = {
            'email': 'recipient@example.com',
            'customerName': 'Test User',
            'productName': 'Test Product',
            'expirationDate': '2023-12-31T23:59:59'
        }
        
        # Ejecutar función
        send_email_reminder(test_subscription)
        
        # Verificar llamadas
        mock_boto3.assert_called_with('ses')
        mock_ses.send_email.assert_called_once()
        
        # Verificar parámetros del email
        call_args = mock_ses.send_email.call_args[1]
        self.assertEqual(call_args['Source'], 'sender@example.com')
        self.assertEqual(call_args['Destination']['ToAddresses'], ['recipient@example.com'])
        self.assertIn('Test User', call_args['Message']['Body']['Text']['Data'])
        self.assertIn('Test Product', call_args['Message']['Body']['Text']['Data'])

    @patch('your_module.get_subscription')
    @patch('your_module.send_email_reminder')
    def test_main(self, mock_send_email, mock_get_subscription):
        # Configurar mocks
        test_subscriptions = [
            {'email': 'test1@example.com', 'customerName': 'User 1'},
            {'email': 'test2@example.com', 'customerName': 'User 2'}
        ]
        mock_get_subscription.return_value = test_subscriptions
        
        # Ejecutar función
        result = main(None, None)
        
        # Verificar resultados
        self.assertEqual(mock_send_email.call_count, 2)
        self.assertEqual(result['statusCode'], 200)
        self.assertEqual(result['body'], 'Emails sent successfully')
        
        # Verificar que se llamó a send_email con cada suscripción
        call_args = [call[0][0] for call in mock_send_email.call_args_list]
        self.assertIn(test_subscriptions[0], call_args)
        self.assertIn(test_subscriptions[1], call_args)

    @patch('your_module.get_subscription')
    @patch('your_module.send_email_reminder')
    def test_main_no_subscriptions(self, mock_send_email, mock_get_subscription):
        # Configurar mocks
        mock_get_subscription.return_value = []
        
        # Ejecutar función
        result = main(None, None)
        
        # Verificar resultados
        mock_send_email.assert_not_called()
        self.assertEqual(result['statusCode'], 200)
        self.assertEqual(result['body'], 'Emails sent successfully')

if __name__ == '__main__':
    unittest.main()