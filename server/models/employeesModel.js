import mongoose from "mongoose";

const employeesSchema =  mongoose.Schema({
   first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  salary: {
    type: Number,
    min: 0
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
},
{
  timestamps:true
})

export const Employee = mongoose.model("employees", employeesSchema)
