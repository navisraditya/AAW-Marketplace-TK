import express from 'express';
import { validate, paginationMiddleware } from "@src/middleware/validate";
import * as Validation from './validation';
import * as Handler from './order.handler';
import { verifyJWT } from "@src/middleware/verifyJWT";

const router = express.Router();

router.get('/seed-seed', Handler.seedOrder)

router.get('', verifyJWT, paginationMiddleware, Handler.getAllOrdersHandler);
router.get('/:orderId', verifyJWT, validate(Validation.getOrderDetailSchema), Handler.getOrderDetailHandler);
router.post('', verifyJWT, validate(Validation.placeOrderSchema), Handler.placeOrderHandler);
router.post('/:orderId/pay', validate(Validation.payOrderSchema), Handler.payOrderHandler);
router.post('/:orderId/cancel', verifyJWT, validate(Validation.cancelOrderSchema), Handler.cancelOrderHandler);

export default router;