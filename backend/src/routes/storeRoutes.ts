import { Router } from 'express';
import { StoreController } from '../controllers/storeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Recycler directory: see which recycler is selling what and at what price!
router.get('/recyclers', StoreController.getRecyclers);
router.get('/recyclers/:recyclerId', StoreController.getRecyclerById);

// Public product browsing and details
router.get('/products', StoreController.getProducts);
router.get('/products/:productId', StoreController.getProductById);

// Recycler listing & management (called by partners or dealers)
router.post('/products', StoreController.listRecyclerProduct);
router.delete('/products/:productId', StoreController.deleteProduct);

// Consumer purchase and order history (require auth)
router.post('/purchase', requireAuth, StoreController.purchaseProduct);
router.get('/my-orders', requireAuth, StoreController.getMyStoreOrders);

export default router;
