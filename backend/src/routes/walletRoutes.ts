import { Router } from 'express';
import { WalletController } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All wallet endpoints require consumer authentication
router.use(requireAuth);

router.get('/', WalletController.getWallet);
router.get('/transactions', WalletController.getTransactions);

export default router;
