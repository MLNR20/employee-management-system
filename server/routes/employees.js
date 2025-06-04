
import express from 'express';
import {Employee} from '../models/employeesModel.js';
import authMiddleware from "../middleware/middleAuth.js"

const router = express.Router();



router.get('/protected', authMiddleware, async(request, response)=>{


     try {
        const user = request.user;
        response.json({
        message: 'Welcome to the protected route!',
        user: user,
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Server error' });
    }

});


//Route for Save a New Employee
router.post('/', authMiddleware, async (request,response)=>{
    try{
        if(!request.body.first_name|| !request.body.last_name|| !request.body.email || !request.body.position|| !request.body.department|| !request.body.salary)
        {
            return response.status(400).send({
                message:'Send all required fields: first name, last name, email, position, department, salary'
            })
        }


        const newEmployee={
            first_name:request.body.first_name,
            last_name: request.body.last_name,
            email: request.body.email,
            position: request.body.position,
            department: request.body.department,
            salary: request.body.salary,
            isActive: request.body.isActive
        }

        const createNewEmployee = await Employee.create(newEmployee);
        return  response.status(200).send(createNewEmployee);
    }
    catch(error){
        console.log(error);
        response.status(500).send({message:error.message})
    }
})



router.get('/', authMiddleware, async (request, response) =>{
    try{
        const employees = await Employee.find({});
        return response.status(200).json({
            count: employees.length,
            data:employees
        });
    }catch(error)
    {
        console.log(error.message);
        response.status(500).send({message:error.message});
    }
});


router.get('/:id', authMiddleware, async (request, response) =>{
    try{
        const {id} = request.params;
        const employees = await Employee.findById(id);
        return response.status(200).json(employees);
    }catch(error)
    {
        console.log(error.message);
        response.status(500).send({message:error.message});
    }
});


router.delete('/:id', authMiddleware, async(request, response) =>{

    try
    {
        const {id} = request.params;

        const result = await Employee.findByIdAndDelete(id);


        if(!result)
        {
        return response.status(404).json({message: 'Employee not found'})

        }


       return response.status(200).json({message:"Employee is successfully deleted."});


    }
    catch(error)
    {
        console.log(error.message);
        response.status(500).send({message: error.message})
    }

});

router.put('/:id', authMiddleware, async(request, response)=>{
    try{

         if(!request.body.first_name|| !request.body.last_name|| !request.body.email || !request.body.position|| !request.body.department|| !request.body.salary)
        {
            return response.status(400).send({
                message:'Send all required fields: first name, last name, email, position, department, salary'
            })
        }

        const {id} = request.params;
        const result = await Employee.findByIdAndUpdate(id, request.body);

        if(!result)
        {
            return response.status(404).json({message: 'Employee found'})
        }


        return response.status(200).json({message:"Employee is successfully updated!"});



    }
    catch(error)
    {
        console.log(error.message);
        response.status(500).send({message: error.message})
    }

})


export default router;