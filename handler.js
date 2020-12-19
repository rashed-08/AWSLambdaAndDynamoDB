'use strict';

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: 'us-west-2'
});

const postTable = process.env.POSTS_TABLE;

function response(statusCode, message) {
    return {
        statusCode: statusCode,
        headers: {
            "Access-Control-Allow-Origin" : "*",
            "Access-Control-Allow-Credentials" : true
        },
        body: JSON.stringify(message)
    };
}

function sortByDate(a,b) {
    if (a.createdAt > b.createdAt) {
        return  -1;
    } else {
        return 1;
    }
}

// Create a new post
module.exports.createPost = (event, context, callback) => {
    const  reqBody = JSON.parse(event.body);

    if (!reqBody.title || reqBody.title.trim() === '' || !reqBody.body || reqBody.body.trim() === '') {
        callback(null, response(400, {error: 'Please provide post title and post body'}))
    }

    const  post = {
        id: context.awsRequestId,
        createdAt: new Date().toISOString(),
        userId: 1,
        title: reqBody.title,
        body: reqBody.body
    };

    dynamoDB.put({
        TableName: postTable,
        Item: post
    }).promise().then(() => {
        callback(null, response(201, post))
    }).catch((err) => response(null, response(err.statusCode, err)));
};

module.exports.getAllPost = (event, context, callback) => {
    const params = {
        TableName: postTable
    };
    return dynamoDB.scan(params).promise()
        .then(res => {
            callback(null, response(200, res.Items.sort(sortByDate)))
        }).catch(err => {
            callback(null, response(err.statusCode, err))
        });
}

module.exports.getPosts = (event, context, callback)=> {
    const numberOfPosts = event.pathParameters.number;
    console.log(event);
    // console.log(numberOfPosts);
    const params = {
        TableName: postTable,
        Limit: numberOfPosts
    };
    return dynamoDB.scan(params).promise()
        .then(res => {
            callback(null, response(200, res.Items.sort(sortByDate)))
        }).catch(err => {
            callback(null, response(err.statusCode, err))
        });
}

module.exports.getPost = (event, context, callback)=> {
    const id = event.pathParameters.id;
    const params = {
        TableName: postTable,
        Key: {
            'id': id
        }
    }
    return dynamoDB.get(params).promise()
        .then(res => {
            if (res.Item) {
                callback(null, response(200, res.Item))
            } else {
                callback(null, res(404, {error: 'Post not found'}))
            }
        }).catch(err => {
            callback(null, response(err.statusCode, err))
        })
}

module.exports.updatePost = (event, context, callback) => {
    const id = event.pathParameters.id;
    const body = JSON.parse(event.body)
    const paramName = body.paramName;
    const paramValue = body.paramValue;
    const params = {
        TableName: postTable,
        Key: {
            id: id
        },
        ConditionExpression: 'attribute_exists(id)',
        UpdateExpression: 'set ' + paramName + ' = :v',
        ExpressionAttributeValues: {
            ':v': paramValue
        },
        ReturnValue: 'ALL_NEW'
    };
    return dynamoDB.update(params).promise()
        .then(res => {
            callback(null, response(200, res))
        }).catch(err => {
            callback(null, response(err.statusCode, err))
        });
}

module.exports.deletePost = (event, context, callback) => {
    const id = event.pathParameters.id;
    const params = {
        TableName: postTable,
        Key: {
            id: id
        }
    };
    return dynamoDB.delete(params).promise()
        .then(() => {
            callback(null, response(200, {message: 'Post deleted successfully!'}))
        }).catch(err => {
            callback(null, response(err.statusCode, err))
        });
}