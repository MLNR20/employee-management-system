import express from 'express';
import  {Administrator}  from '../models/administratorsModel.js';
import bcrypt from 'bcryptjs'; // Use ES6 import for consistency
import jwt from 'jsonwebtoken'

const routerAdmin = express.Router();


routerAdmin.get('/', async(req,res) =>{

 try {
      const result = await Administrator.find();

      if(result.length === 0)
      {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash("password0123@", saltRounds);
        const newUser = new Administrator({username: "Test", password: hashedPassword, first_name: "Admin", last_name:"Account", email: "test@gmail.com"});
        await newUser.save();
        res.json({message: "Newly created!"});
      }
      else
      {
        res.json(result);
      }

    } 
    catch (err) {
      res.status(500).json({ error: err.message });
    }


})

routerAdmin.post('/login', async(req,res)=>{

    const user = {
        username: req.body.username,
        password: req.body.password
    }

  
    const usernameMatch = await Administrator.findOne({
        username: req.body.username,
    })

    if(!usernameMatch)
    {
        return res.status(400).send("User not found");
    }


    const isMatch = await bcrypt.compare(req.body.password,usernameMatch.password)

    if(!isMatch)
    {
        return res.status(400).send("Invalid password")
    }


    if(usernameMatch && isMatch)
    {

        const token = jwt.sign({
            id: usernameMatch._id,
            username: usernameMatch.username,
            first_name: usernameMatch.first_name,
            last_name: usernameMatch.last_name
        } ,'secret123',  { expiresIn: '1h' })

        return res.status(200).json({
            message: 'Login successful',
            token:token
        })

    }
    else
    {
        return res.status(200).json({
            user: false,
            status: 'error'
         
        })
    }

});


routerAdmin.post('/register', async (request, response) => {
  try {
    const { username, password, first_name, last_name, email } = request.body;

    if (!username || !password || !first_name || !last_name || !email) {
      return response.status(400).send({
        message: 'Send all required fields: username, password, first name, last name, email',
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      username: username,
      password: hashedPassword,
      first_name: first_name,
      last_name: last_name,
      email: email
    };

    const createNewUser = await Administrator.create(newUser);

    return response.status(200).send(createNewUser);
  } catch (error) {
    console.error(error);


    if(error.code === 11000)
    {
      return response.status(400).json({message: "Username or email already exists",       message: 'Duplicate entry',
        code: error.code, 
      });
    }
    
    return response.status(500).send({ message: error.code });
  }
});

export default routerAdmin;