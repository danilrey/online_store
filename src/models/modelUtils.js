//common validation regex patterns
const validators = {
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please provide a valid email'
  },
  phone: {
    regex: /^\+?[1-9]\d{1,14}$/,
    message: 'Please provide a valid phone number'
  }
};

//common field constraints
const constraints = {
  minName: 2,
  minPassword: 4,
  minDescription: 10,
  maxComment: 1000,
  maxTitle: 100,
  maxNotes: 500
};

//generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${random}`;
};

//common schema options
const timestampOptions = {
  timestamps: true
};

//common index builder helper
const buildCompoundIndex = (fields) => {
  return fields.reduce((acc, field) => {
    acc[field.name] = field.order || 1;
    return acc;
  }, {});
};

//common pre-save hook for hashing passwords
const hashPasswordHook = async function(next, bcrypt) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
};

//common method to compare passwords
const comparePasswordMethod = async function(candidatePassword, bcrypt) {
  return await bcrypt.compare(candidatePassword, this.password);
};

//common method to remove sensitive fields
const toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

//create reference field to another model
const createRef = (modelName, required = true) => ({
  type: require('mongoose').Schema.Types.ObjectId,
  ref: modelName,
  required: required ? [true, `${modelName} is required`] : false
});

//create embedded array of references
const createRefArray = (modelName) => ([{
  type: require('mongoose').Schema.Types.ObjectId,
  ref: modelName
}]);

module.exports = {
  validators,
  constraints,
  generateOrderNumber,
  timestampOptions,
  buildCompoundIndex,
  hashPasswordHook,
  comparePasswordMethod,
  toPublicJSON,
  createRef,
  createRefArray
};
