const express =  require('express'); 
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
    const commentID = randomBytes(4).toString('hex'); 
    const { content } = req.body; 

    const comments = commentsByPostId[req.params.id] || [];

    comments.push({ id: commentID, content, status: 'pending' }); 

    commentsByPostId[req.params.id] = comments;

    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated', 
        data: {
            id: commentID, 
            content, 
            postId: req.params.id, 
            status: 'pending'
        }
    });

    res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
    console.log('Received Event', req.body.type);

    const { type, data } = req.body;

    if (type === 'CommentModerated') {
        const {postId, id, status, content} = data;
        console.log(postId, id, status, content);
        const comments = commentsByPostId[postId];
        console.log(comments);
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        comment.status = status;

        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: {
                id, 
                status, 
                postId, 
                content
            }
        })
    }

    res.send({});
});

app.listen(4001, () => {
    console.log("Comments Service running on port 4001");
})