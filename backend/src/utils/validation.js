import Joi from 'joi';

/**
 * Schémas de validation Joi
 */
export const schemas = {
  // Produit
  product: Joi.object({
    sku: Joi.string().allow('', null),
    title: Joi.string().required().min(1).max(255),
    description: Joi.string().allow('', null),
    price: Joi.number().required().min(0),
    currency: Joi.string().default('MGA'),
    stock: Joi.number().integer().min(0).default(0),
    image_path: Joi.string().allow('', null),
  }),

  // Devis
  devis: Joi.object({
    conversation_id: Joi.string().uuid().allow(null),
    contact_phone: Joi.string().required(),
    contact_name: Joi.string().allow('', null),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().allow(null),
        title: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })
    ).min(1).required(),
    tax: Joi.number().min(0).default(0),
    currency: Joi.string().default('MGA'),
  }),

  // FAQ
  faq: Joi.object({
    question: Joi.string().required().min(1).max(500),
    answer: Joi.string().required().min(1).max(2000),
    language: Joi.string().valid('fr', 'mg').default('fr'),
  }),

  // Settings
  settings: Joi.object({
    key: Joi.string().required(),
    value: Joi.string().allow('', null),
  }),

  // Envoi message WhatsApp
  sendMessage: Joi.object({
    phone: Joi.string().required(),
    message: Joi.string().required().min(1).max(4096),
    conversation_id: Joi.string().uuid().allow(null),
  }),

  // Conversation status
  conversationStatus: Joi.object({
    status: Joi.string().valid('open', 'closed', 'archived').required(),
    prospect_status: Joi.string().valid('new', 'contacted', 'qualified', 'converted', 'lost').allow(null),
  }),
};

/**
 * Middleware de validation
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({ errors });
    }
    
    next();
  };
};

