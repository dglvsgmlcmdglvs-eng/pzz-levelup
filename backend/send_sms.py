import boto3


def enviar_sms(telefone, codigo):
    client = boto3.client("sns")

    mensagem = f"Seu código é: {codigo}"

    response = client.publish(
        PhoneNumber=telefone,  # Ex: +5585999999999
        Message=mensagem,
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {
                "DataType": "String",
                "StringValue": "Transactional",
            }
        },
    )

    return response
