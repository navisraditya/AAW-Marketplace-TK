import express from 'express';
import { validate } from "@src/middleware/validate";
import * as Validation from './validation';
import * as Handler from './cart.handler';
import { verifyJWT } from "@src/middleware/verifyJWT";
import { paginationMiddleware } from "@src/middleware/validate";

const router = express.Router();

router.get('', verifyJWT, paginationMiddleware, Handler.getAllCartItemsHandler);
router.post('', verifyJWT, validate(Validation.addItemToCartSchema), Handler.addItemToCartHandler);
router.put('', verifyJWT, validate(Validation.editCartItemSchema), Handler.editCartItemHandler);
router.delete('', verifyJWT, validate(Validation.deleteCartItemSchema), Handler.deleteCartItemHandler);

export default router;