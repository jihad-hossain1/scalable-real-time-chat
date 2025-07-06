import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

export const updateProfileSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Avatar must be a valid URL'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

// Message validation schemas
export const sendMessageSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content must not exceed 5000 characters',
      'any.required': 'Message content is required'
    }),
  recipientId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Recipient ID must be a valid UUID'
    }),
  groupId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Group ID must be a valid UUID'
    }),
  messageType: Joi.string()
    .valid('text', 'image', 'file')
    .default('text')
    .messages({
      'any.only': 'Message type must be one of: text, image, file'
    })
}).xor('recipientId', 'groupId').messages({
  'object.xor': 'Either recipientId or groupId must be provided, but not both'
});

export const editMessageSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content must not exceed 5000 characters',
      'any.required': 'Message content is required'
    })
});

export const messageStatusSchema = Joi.object({
  messageId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Message ID must be a valid UUID',
      'any.required': 'Message ID is required'
    }),
  status: Joi.string()
    .valid('delivered', 'read')
    .required()
    .messages({
      'any.only': 'Status must be either delivered or read',
      'any.required': 'Status is required'
    })
});

// Group validation schemas
export const createGroupSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Group name cannot be empty',
      'string.max': 'Group name must not exceed 100 characters',
      'any.required': 'Group name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Group description must not exceed 500 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Group avatar must be a valid URL'
    }),
  memberIds: Joi.array()
    .items(Joi.string().uuid())
    .min(0)
    .max(50)
    .optional()
    .messages({
      'array.max': 'Cannot add more than 50 members at once',
      'string.uuid': 'All member IDs must be valid UUIDs'
    })
});

export const updateGroupSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Group name cannot be empty',
      'string.max': 'Group name must not exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Group description must not exceed 500 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Group avatar must be a valid URL'
    })
});

export const addGroupMembersSchema = Joi.object({
  memberIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one member ID is required',
      'array.max': 'Cannot add more than 20 members at once',
      'string.uuid': 'All member IDs must be valid UUIDs',
      'any.required': 'Member IDs are required'
    })
});

export const removeGroupMemberSchema = Joi.object({
  memberId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Member ID must be a valid UUID',
      'any.required': 'Member ID is required'
    })
});

export const updateMemberRoleSchema = Joi.object({
  memberId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Member ID must be a valid UUID',
      'any.required': 'Member ID is required'
    }),
  role: Joi.string()
    .valid('admin', 'member')
    .required()
    .messages({
      'any.only': 'Role must be either admin or member',
      'any.required': 'Role is required'
    })
});

// Typing indicator schema
export const typingIndicatorSchema = Joi.object({
  recipientId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Recipient ID must be a valid UUID'
    }),
  groupId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Group ID must be a valid UUID'
    }),
  isTyping: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Typing status is required'
    })
}).xor('recipientId', 'groupId').messages({
  'object.xor': 'Either recipientId or groupId must be provided, but not both'
});

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
  search: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Search query must not exceed 100 characters'
    })
});

// UUID parameter validation
export const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID must be a valid UUID',
      'any.required': 'ID is required'
    })
});