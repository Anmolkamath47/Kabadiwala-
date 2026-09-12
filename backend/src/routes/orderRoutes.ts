import { Router } from 'express';
import {
  OrderController,
  CreateOrderSchema,
  CancelOrderSchema,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', validateRequest(CreateOrderSchema), OrderController.createOrder);
router.get('/', OrderController.getConsumerOrders);
router.get('/:orderId', OrderController.getOrderDetails);
router.post('/:orderId/cancel', validateRequest(CancelOrderSchema), OrderController.cancelOrder);

export default router;
