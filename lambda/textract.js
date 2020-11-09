const AWS = require('aws-sdk');
const _ = require("lodash");

const textract = new AWS.Textract({apiVersion: '2018-06-27'});
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
        
    try{
        const source = Buffer.from(event.sourceBase64, 'base64');

        var params = {
            Document: { 
              Bytes: source
            },
            FeatureTypes: ["FORMS", "TABLES"]
        };

        const data = await textract.analyzeDocument(params).promise();
        
        const { keyMap, valueMap, blockMap } = getKeyValueMap(data.Blocks);
        const keyValues = getKeyValueRelationship(keyMap, valueMap, blockMap);
        
        console.log(keyValues);
        var params = {
            TableName:'aplicaciones',
            Item:keyValues
        };

        const resDynamo = await docClient.put(params).promise();
        return {
            statusCode: 200,
            data: resDynamo
        }
        
    }    
    catch(err){
        return {
            statusCode: 500,
            body: err
        };
    }
};

const getText = (result, blocksMap) => {
  let text = "";

  if (_.has(result, "Relationships")) {
    result.Relationships.forEach(relationship => {
      if (relationship.Type === "CHILD") {
        relationship.Ids.forEach(childId => {
          const word = blocksMap[childId];
          if (word.BlockType === "WORD") {
            text += `${word.Text} `;
          }
          if (word.BlockType === "SELECTION_ELEMENT") {
            if (word.SelectionStatus === "SELECTED") {
              text += `X `;
            }
          }
        });
      }
    });
  }

  return text.trim();
};

const findValueBlock = (keyBlock, valueMap) => {
  let valueBlock;
  keyBlock.Relationships.forEach(relationship => {
    if (relationship.Type === "VALUE") {
      // eslint-disable-next-line array-callback-return
      relationship.Ids.every(valueId => {
        if (_.has(valueMap, valueId)) {
          valueBlock = valueMap[valueId];
          return false;
        }
      });
    }
  });

  return valueBlock;
};

const getKeyValueRelationship = (keyMap, valueMap, blockMap) => {
  const keyValues = {};

  const keyMapValues = _.values(keyMap);

  keyMapValues.forEach(keyMapValue => {
    const valueBlock = findValueBlock(keyMapValue, valueMap);
    const key = getText(keyMapValue, blockMap).replace(":", "");
    const value = getText(valueBlock, blockMap);
    keyValues[key] = value;
  });

  return keyValues;
};

const getKeyValueMap = blocks => {
  const keyMap = {};
  const valueMap = {};
  const blockMap = {};

  let blockId;
  blocks.forEach(block => {
    blockId = block.Id;
    blockMap[blockId] = block;

    if (block.BlockType === "KEY_VALUE_SET") {
      if (_.includes(block.EntityTypes, "KEY")) {
        keyMap[blockId] = block;
      } else {
        valueMap[blockId] = block;
      }
    }
  });

  return { keyMap, valueMap, blockMap };
};