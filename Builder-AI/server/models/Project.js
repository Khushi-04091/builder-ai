import mongoose, {Schema} from 'mongoose'

const MessageSchema=new Schema({
role:{type:String,enum:["user","assistant"],required:true},
content:{type:String,required:true},
timestamp:{type:Date,default:Date.now},

},{_id:false})

const PlannedFileSchema=new Schema({
    path:{type:String,required:true},
    description:{type:String,required:true}

},{_id:false})

const ProjectSchema=new Schema({
    name:{type:String,required:true,default:"Untitled Project"},
    description:{type:String,default:""},
    files:{type:Schema.Types.Mixed,default:{}},
    messages:{type:[MessageSchema],default:[]},
    version:{type:Number,default:0},
    owner:{type:Schema.Types.ObjectId,ref:"User",required:true},
    published:{type:Boolean,default:false},
    status:{type:String,enum:["pending","generating","revising","completed","failed"],dafault:"pending"},
    filesPlanned:{type:[PlannedFileSchema],dafault:[]},
    filesGenerated:{type:[String],default:[]},
    currentFile:{type:String,default:null},
    error:{type:String,dafult:null}


    

},{timestamps:true})




export const Project=mongoose.model('Project',ProjectSchema)

