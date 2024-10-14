import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Checkbox,
  Button,
  Paper,
  Grid,
  Snackbar,
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import api from '../../API/api';
import { useParams } from 'react-router-dom';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const CheckoutForm = () => {
  const { userId } = useParams();

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [cartTotal, setCartTotal] = useState(0);
  const [userDetails, setUserDetails] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    addresses: [{ city: '', state: '', homeNumber: '', pinCode: '', landmark: '' }],
  });
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    if (userId) {
      fetchCartData();
      fetchUserDetails();
    }
  }, [userId]);

  // Fetch cart details and calculate subtotal
  const fetchCartData = async () => {
    try {
      const response = await api.get('/cart', { withCredentials: true });
      const { products } = response.data;

      const subtotal = products.reduce((acc, item) => {
        return acc + item.product.discountedPrice * item.quantity;
      }, 0);

      setCartTotal(subtotal);
    } catch (error) {
      showSnackbar('Failed to load cart details', 'error');
    }
  };

  // Fetch user details for shipping and billing address
  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/users/profile/${userId}`, { withCredentials: true });
      const user = response.data.user;

      // If the user has no addresses, initialize an empty address object
      if (!user.addresses.length) {
        user.addresses = [{ city: '', state: '', homeNumber: '', pinCode: '', landmark: '' }];
      }

      setUserDetails(user);
    } catch (error) {
      showSnackbar('Failed to load user details', 'error');
    }
  };

  // Update user profile
  const updateUserProfile = async () => {
    try {
      const updatedData = {
        fullName: userDetails.fullName,
        email: userDetails.email,
        phoneNumber: userDetails.phoneNumber,
        addresses: userDetails.addresses,
      };

      const response = await api.put(`/profile/${userId}`, updatedData, { withCredentials: true });
      showSnackbar(response.data.message, 'success');
    } catch (error) {
      showSnackbar('Failed to update user profile', 'error');
    }
  };

  // Handle coupon code application
  const handleApplyCoupon = async () => {
    try {
      const response = await api.post('/cart/apply-coupon', { couponCode }, { withCredentials: true });
      const discount = response.data.discount;
      setCartTotal(cartTotal - discount);
      showSnackbar('Coupon applied successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to apply coupon', 'error');
    }
  };

  // Show Snackbar (MUI Toaster)
  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', padding: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {/* Shipping Information */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Shipping information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  variant="outlined"
                  value={userDetails.fullName}
                  onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  value={userDetails.email}
                  onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  variant="outlined"
                  value={userDetails.phoneNumber}
                  onChange={(e) => setUserDetails({ ...userDetails, phoneNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="State"
                  variant="outlined"
                  value={userDetails.addresses[0]?.state || ''}
                  onChange={(e) => {
                    const updatedAddresses = [...userDetails.addresses];
                    updatedAddresses[0].state = e.target.value;
                    setUserDetails({ ...userDetails, addresses: updatedAddresses });
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="City"
                  variant="outlined"
                  value={userDetails.addresses[0]?.city || ''}
                  onChange={(e) => {
                    const updatedAddresses = [...userDetails.addresses];
                    updatedAddresses[0].city = e.target.value;
                    setUserDetails({ ...userDetails, addresses: updatedAddresses });
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  variant="outlined"
                  value={userDetails.addresses[0]?.homeNumber || ''}
                  onChange={(e) => {
                    const updatedAddresses = [...userDetails.addresses];
                    updatedAddresses[0].homeNumber = e.target.value;
                    setUserDetails({ ...userDetails, addresses: updatedAddresses });
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Checkbox checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />}
                  label="Same as shipping information"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Method */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Payment method
            </Typography>
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <FormControlLabel value="cod" control={<Radio />} label="Cash on delivery (COD)" />
              <FormControlLabel value="stripe" control={<Radio />} label="Pay online via Stripe" />
              <FormControlLabel value="paypal" control={<Radio />} label="PayPal" />
            </RadioGroup>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Cart Summary */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cart Summary
            </Typography>
            <Typography>Subtotal: ${cartTotal.toFixed(2)}</Typography>
            <Typography>Tax: $0.00</Typography>
            <Typography>Shipping fee: $0.00</Typography>
            <Typography variant="h6">Total: ${cartTotal.toFixed(2)}</Typography>

            <Box sx={{ mt: 2 }}>
              <Button variant="text" size="small" onClick={() => setShowCouponInput(!showCouponInput)}>
                You have a coupon code?
              </Button>
              {showCouponInput && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <Button variant="contained" sx={{ mt: 1 }} onClick={handleApplyCoupon}>
                    Apply Coupon
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for messages */}
      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CheckoutForm;
