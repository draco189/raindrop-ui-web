import React, { Component } from 'react';
import { QRCode } from 'react-qr-svg';
import logo from './hydroLogo.svg';
import './App.css';

const JsonTable = require('ts-react-json-table');

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      database: [{}],

      raindropEnabled: false,
      hydroIDConfirmed: false,

      claimedHydroID: '',
      linkedHydroID: null,
      internalUsername: localStorage.getItem('internalUsername') || 'TestUser',

      signUpStatus: '',
      verificationStatus: '',
      firstTimeVerificationStatus: '',
    };

    this.getLinkedHydroID(this.state.internalUsername);
    this.getMessage();

    this.verify = this.verify.bind(this);
    this.registerUser = this.registerUser.bind(this);
    this.unregisterUser = this.unregisterUser.bind(this);

    this.refreshDatabase = this.refreshDatabase.bind(this);

    this.internalUsernameChange = this.internalUsernameChange.bind(this);
    this.claimedHydroIDChange = this.claimedHydroIDChange.bind(this);
  }

  // displays the status of the hydroID based on state variables from the backend
  hydroIDStatus = () => {
    if (this.state.raindropEnabled) {
      return (
        <div>
          Your account <strong>does</strong> have Raindrop 2FA enabled, {this.state.hydroIDConfirmed ? 'and ' : 'but '}
          it is <strong>{this.state.hydroIDConfirmed ? 'confirmed' : 'unconfirmed'}</strong>.
          <br/>
          Your HydroID is saved as: <strong>{this.state.linkedHydroID}</strong>.
          <br/>
          <br/>
          <form onSubmit={this.unregisterUser}>
            <input type="submit" value=" Unregister " />
          </form>
        </div>
      )
    } else {
      return (
        <div>
          Your account <strong>does not</strong> have Raindrop 2FA enabled.
        </div>
      )
    }
  }

  // displays the appropriate html depending on whether or not the internal user has raindrop enabled or not
  body = () => {
    if (!this.state.raindropEnabled || !this.state.hydroIDConfirmed) {
      return (
        <div>
          <h2>First Time Sign-Up</h2>
            <p className="text">
              Enter your HydroID, visible in the Hydro mobile app.
            </p>
            <br/>
            <form onSubmit={this.registerUser}>
              <label>
                HydroID: <input type="text" value={this.state.claimedHydroID} onChange={this.claimedHydroIDChange} />
              </label>
              <input type="submit" value=" Link " />
            </form>
            <br/>
            <div className="result-box">
              {this.state.signUpStatus}
            </div>
            <br/>
            <p className="text">Complete first-time verification by entering the code below into the Hydro mobile app.</p>
            {this.renderMessage(false)}
            <form onSubmit={(e) => this.verify(e, this.state.messageToSign, "firstTimeVerificationStatus")}>
              <input type="submit" value=" Authenticate " />
            </form>
            <br/>
            <div className="result-box">
              {this.state.firstTimeVerificationStatus}
            </div>
            <br/>
          </div>
        )
    } else {
      return (
        <div>
          <h2>Authentication</h2>
          <p className="text">Enter the code below into the Hydro mobile app</p>
          {this.renderMessage(false)}
          <form onSubmit={(e) => this.verify(e, this.state.messageToSign, "verificationStatus")}>
            <input type="submit" value=" Authenticate " />
          </form>
          <br/>
          <div className="result-box">
            {this.state.verificationStatus}
          </div>
        </div>
      )
    }
  }

  // updates the claimed hydroID on form change
  claimedHydroIDChange(event) {
    this.setState({claimedHydroID: event.target.value});
  }

  // updates the internal username. Different names correspond to different users
  // FOR EXAMPLE PURPOSES ONLY. In reality, sessions obviously should not be manipulable by users.
  internalUsernameChange (event) {
    this.setState({internalUsername: event.target.value});
    localStorage.setItem('internalUsername', event.target.value);
    this.getLinkedHydroID(event.target.value);
  }

  // gets a message for the user to sign
  getMessage () {
    fetch('/message', {
      method: 'GET',
      headers: {
        'Content-Type': 'image/svg'
      }
    })
      .then(response => { return response.json() })
      .then(json => { this.setState({messageToSign: json.message}) })
      .catch(error => { console.log(error) });
  }

  renderMessage = (asQR) => {
    if (asQR && this.state.messageToSign) {
      return (
        <QRCode
          bgColor="#FFFFFF"
          fgColor="#000000"
          level="Q"
          style={{ width: 256 }}
          value={this.state.messageToSign}
        />
      )
    } else {
      return <p><font size="+3">{this.state.messageToSign}</font></p>
    }
  }

  // updates the displayed database at the bottom of the page from the backend. FOR EXAMPLE PURPOSES ONLY
  refreshDatabase () {
    fetch('/getDatabase', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => { return response.json() })
      .then(data => { this.setState({database: data}) })
      .catch(error => { console.log(error) });
  }

  // updates state variables that define the state of the internal users's linkage to raindrop 2FA
  async getLinkedHydroID (internalUsername) {
    await this.refreshDatabase()
    fetch('/isInDatabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        internalUsername: internalUsername
      })
    })
      .then(response => { return response.json() })
      .then(data => {
        if (data.exists) {
          this.setState(
            {linkedHydroID: data.hydroID, hydroIDConfirmed: data.confirmed, raindropEnabled: true}
          )
        } else {
          this.setState({linkedHydroID: null, hydroIDConfirmed: false, raindropEnabled: false})
        }
      })
      .catch(error => {
        this.setState({linkedHydroID: "Error.", hydroIDConfirmed: false, raindropEnabled: false})
        console.log(error)
      });
  }

  // registers a user for Raindrop 2FA
  registerUser (event) {
    event.preventDefault();
    this.setState({signUpStatus: 'Loading...'})
    return fetch('/registerUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        internalUsername: this.state.internalUsername,
        hydroID: this.state.claimedHydroID
      })
    })
      .then(response => { return response.json() })
      .then(data => {
        if (data.registered) {
          this.setState({signUpStatus: 'Successful link, proceed to verification'})
          this.getLinkedHydroID(this.state.internalUsername);
        } else {
          this.setState({signUpStatus: 'Unsuccessful link (check backend logs)'})
        }
      })
      .catch(error => {
        console.log(error)
        this.setState({signUpStatus: 'Error (check frontend logs)'})
      });
  };

  // unregisters a user for Raindrop 2FA
  unregisterUser (event) {
    event.preventDefault();
    return fetch('/unregisterUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        internalUsername: this.state.internalUsername
      })
    })
      .then(() => {
        this.getLinkedHydroID(this.state.internalUsername);
      })
      .catch(error => {
        console.log(error)
      });
  };

  // verifies a message (treats first-time verification requests differently that ongoing requests from verified users)
  verify (event, message, updateField) {
    event.preventDefault();
    this.setState({[updateField]: 'Loading...'})
    return fetch(`/verifySignature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // we only need to pass the user's internal identifier, their hydro username is already stored in the backend
      body: JSON.stringify({message: message, internalUsername: this.state.internalUsername})
    })
      .then(response => { return response.json() })
      .then(data => {
        if (data.verified) {
          if (updateField === "firstTimeVerificationStatus") {
            this.setState({[updateField]: 'Success! Redirecting, please wait...'})
              this.getLinkedHydroID(this.state.internalUsername)
            setTimeout(() => {
              this.getMessage()
              this.setState({
                signUpStatus: "", firstTimeVerificationStatus: "", verificationStatus: "", claimedHydroID: ""
              })
            }, 4000)
          } else {
            this.setState({[updateField]: 'Success!'})
          }
        } else {
          this.setState({[updateField]: 'Failure (check backend logs)'})
        }
      })
      .catch(error => {
        this.setState({[updateField]: 'Error (check frontend logs)'})
        console.log(error)
      });
  };

  // render the main page
  render() {
    return (
      <div className="App">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Client-Side Raindrop Demo</h1>
        <hr color="black"></hr>
        {this.body()}
        <hr color="black"></hr>
        <h2>Session Data</h2>
        <label>Internal Username: </label><input type="text" value={this.state.internalUsername} onChange={this.internalUsernameChange} />
        {this.hydroIDStatus()}
        <br/>
        <h2>Database</h2>
        <JsonTable className='table' rows = {this.state.database} />
        <br/>
      </div>
    );
  }
}

export default App;
