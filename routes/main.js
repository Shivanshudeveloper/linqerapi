const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
// Environment variables
require('dotenv').config()
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const User_Model = require("../models/Users.js");
const { route } = require("express/lib/application");
const Stripe_Session_ID = require("../models/StripeSessionID.js");
const UserDetails = require("../models/UserDetails");
const Notification = require("../models/Notification");
const { count } = require("../models/Users.js");
const e = require("express");

// const stripe = require("stripe")(
//   "sk_test_51JtwGyI9g5Ngs2dw2qHiAxsDqw8CkSjRWgpIvCTjRVAWwe0HowJOvCxxZ1u3wI92n899IuEfyctRNmSLgnWux5Hr00ACQNlXV1"
// );
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Redirect domain : Change to an appropriate value as and when needed
const YOUR_DOMAIN = 'http://localhost:3000/dashboard/account';

// TEST
// @GET TEST
// GET
router.get("/test", (req, res) => {
  res.send("Working");
});

router.post("/register", async (req, res) => {
  const data = req.body;
  const newUser = await User_Model.create(data);
  res.json(newUser);
});

router.post("/charges", async (req, res) => {
  const { email, amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: "usd",
    // Verify your integration in this guide by including this parameter
    metadata: { integration_check: "accept_a_payment" },
    receipt_email: email,
  });

  res.json({ client_secret: paymentIntent["client_secret"] });
});


// Send a mail to users who have registered 
router.post("/register_send_email", async (req, res) => {
  const { email } = req.body;

  const message = {
    to: [email],
    from: {
      name: "Linqer",
      email: "info@linqer.io"
    },
    subject: "Signup successful",
    // If the reciver's email client does not support html mails then the message will default to text  
    text: `Thank you for signing up to Linqer`,
    html: `<h1>Thank you for signing up to Linqer</h1>`
  }

  sgMail.send(message)
    .then(response => {
      res.send("Email sent")
    })
    .catch(err => {
      res.json(err)
    })
});

// Send a mail to users who have registered 
router.post("/subscription_success", async (req, res) => {
  const { email } = req.body;

  const message = {
    to: [email],
    from: {
      name: "Linqer",
      email: "info@linqer.io"
    },
    subject: "Subscription added",
    text: `Your subscription was successfully added`,
    html: `<h1>Your subscription was successfully added</h1>`
  }

  sgMail.send(message)
    .then(response => {
      res.send("Email sent")
    })
    .catch(err => {
      res.json(err)
    })
});

// Send an email 
router.post("/send_email", async (req, res) => {
  const { email, subject, body } = req.body;

  const message = {
    to: [email],
    from: {
      name: "Linqer",
      email: "info@linqer.io"
    },
    subject: `${subject}`,
    // If the reciver's email client does not support html mails then the message will default to text  
    text: `${body}`,
    html: `<h1>${body}</h1>`
  }

  sgMail.send(message)
    .then(response => {
      res.send("Email sent")
    })
    .catch(err => {
      res.json(err)
    })
});

// Redirects to the payment page
router.post('/create-checkout-session', async (req, res) => {

  // const prices = await stripe.prices.list({
  //   lookup_keys: [req.body.lookup_key],
  //   expand: ['data.product'],
  // });

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price: "price_1KVqjQI9g5Ngs2dwZy2ziY04",
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN}/?success=true&sessionId={CHECKOUT_SESSION_ID}&userID=1234`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`,
  });

  res.redirect(303, session.url);
});

// Redirects to the page responsible for handling the subscription details
router.post('/create-portal-session', async (req, res) => {
  // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
  // Typically this is stored alongside the authenticated user in your database.
  console.log(req.body)

  const { session_id } = req.body;
  if (!session_id)
    res.json(false)

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = YOUR_DOMAIN;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer,
    return_url: returnUrl,
  });

  res.redirect(303, portalSession.url);
});

router.post('/check_session_id', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId)
    res.json(false)

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  // console.log(checkoutSession)

  if (checkoutSession.status === "complete" && checkoutSession.expires_at < new Date().getTime())
    res.json(true)
  else
    res.json(false)
});

router.post('/save_session_id', async (req, res) => {

  Stripe_Session_ID.find({ sessionID: req.body.session })
    .then((data) => {
      if (data.length === 0) {
        let newSession = new Stripe_Session_ID({
          userID: req.body.userID,
          sessionID: req.body.sessionID
        })

        newSession.save((err) => {
          if (err)
            res.status(400).json(`Error: ${err}`)
          else
            res.status(200).send("Saved the session")
        })
      }
    })
    .catch((err) => res.status(400).json(`Error: ${err}`));

})

router.get('/get_session_id/:userID', async (req, res) => {

  Stripe_Session_ID.find({ userID: req.params.userID }, (err, session) => {
    if (err)
      res.status(400).json(`Error: ${err}`)
    else
      res.status(200).send(session)
  })

})


// User details
router.post("/set_user_details", async (req, res) => {

  let { name, address, country, phone, pincode, city, userID } = req.body

  if (!name || !address || !country || !phone || !pincode || !city || !userID)
    res.status(403).send("details incomplete")

  else {
    let userDetails = new UserDetails({
      name,
      phone,
      address,
      country,
      city,
      pincode,
      userID
    })

    userDetails.save((err) => {
      if (err)
        res.status(400).json(`Error: ${err}`)
      else
        res.status(200).send("Saved user details")
    })
  }
})

router.get("/user_details/:userID", async (req, res) => {

  if (!req.params.userID)
    res.status(403).send("user id not provided")

  else
    UserDetails.findOne({ userID: req.params.userID }, (err, userDetails) => {
      if (err)
        res.status(500).send(err)
      else
        res.status(200).send(userDetails)
    })
})

router.patch("/update_user_details/:ID", async (req, res) => {

  UserDetails.updateOne({ _id: req.params.ID },
    {
      $set: req.body
    },
    (err) => {
      if (err)
        res.send(err);
      else
        res.send("updated user details")
    })
})

// Notifications
router.post("/new_notification", async (req, res) => {

  let { name, message, userID } = req.body

  let newNotification = new Notification({
    name,
    message,
    userID,
    createdOn: new Date()
  })

  newNotification.save((err) => {
    if (err)
      res.status(400).json(`Error: ${err}`)
    else
      res.status(200).send("added a new notification")
  })
})

router.get("/get_notifications/:userID", async (req, res) => {

  if (!req.params.userID)
    res.status(403).send("user id not provided")

  else
    Notification.find({ userID: req.params.userID }, (err, notifications) => {
      if (err)
        res.status(500).send(err)
      else
        res.status(200).send(notifications)
    })
})

router.delete("/delete_notification/:ID", async (req, res) => {

  Notification.deleteOne({ _id: req.params.ID }, (err) => {
    if (err)
      res.send(err)
    else
      res.send("deleted one notification successfully!")
  })
})

module.exports = router;
