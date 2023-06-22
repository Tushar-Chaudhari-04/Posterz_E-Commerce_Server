// "use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
// This is your test secret API key.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  // Method 1: Creating an entirely custom Controller action
  async customOrderController(ctx) {
    try {
   //   ctx.body = "ok";
   //To call backend and get data
      const entries = await strapi.entityService.findMany('api::product.product', {
      fields:["title"],
      limit:4
      });
      return {data:entries}
    } catch (err) {
      ctx.body = err;
    }
  },
  async create(ctx){
    try {
      console.log("ctx",ctx);
      const {products}=ctx.request.body;
      console.log("products",products)

      const lineItems=await Promise.all(products.map(async (product)=>{
        const image = product.image
        const productEntries=await strapi.entityService.findMany("api::product.product",{
          filters:{
            key:product.key
          }
        });
        console.log("productEntries",productEntries);
        const realProduct=productEntries[0];
        console.log("realProduct",realProduct)
        return{
          price_data:{
            currency:"inr",
            product_data:{
              name:realProduct.title,
              images:[image]
            },
            unit_amount:realProduct.price*100      //realProduct to validate pricing of products
          },
          quantity:product.quantity
        }
      }))

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: {
          allowed_countries: ['IN'],
        },
        line_items:lineItems,
        mode: 'payment',
        success_url: `${process.env.CLIENT_BASE_URL}/payments/success`,
        cancel_url: `${process.env.CLIENT_BASE_URL}/payments/failure`,
      });

      //res.redirect(303, session.url);

      const data = await strapi.entityService.create('api::order.order', {
        data: {
          products,
          stripeId:session.id
        },
      });
      return {stripeId:session.id};
    } catch (err) {
      console.log(err)
      ctx.response.status=500;
      return err;
    }
  }
}));


/*
 // fields: ['title', 'description'],
        // filters: { title: 'Hello World' },
        // sort: { createdAt: 'DESC' },
        // populate: { category: true },


line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            price: '{{PRICE_ID}}',
            quantity: 1,
          },
        ],

*/
