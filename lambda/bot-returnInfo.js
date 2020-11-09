const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    // TODO implement
    
    const data = event.currentIntent.slots;
    
    var nombre = data.Nombre.charAt(0).toUpperCase() + data.Nombre.slice(1);
    var apellido = data.Apellido.charAt(0).toUpperCase() + data.Apellido.slice(1);
    var dato = data.Dato;
    if(dato == "")
    
    var params = {
        TableName : 'aplicaciones',
        FilterExpression : 'Nombre = :nombre',
        ExpressionAttributeValues : {':nombre' : nombre + " " + apellido}
    };
    

    const resDynamo = await docClient.scan(params).promise();
    
    console.log(resDynamo);
    var message, fulfillmentState;
    if(resDynamo.Count == 0){
        fulfillmentState = "Failed"
        message = `Lo siento, no encontre registros de ${nombre} ${apellido}.`
    }else{
        fulfillmentState = "Fulfilled"
        message = `Encontre la data que buscas... ${resDynamo.Items[0][dato]}`
    }
    
    return {
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": fulfillmentState,
            "message": {
              "contentType": "PlainText",
              "content": message
            }
        }
    }
};
