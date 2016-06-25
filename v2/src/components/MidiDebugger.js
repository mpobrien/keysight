import React from 'react';
import { connect } from 'react-redux';


class ExampleComponent extends React.Component {
  constructor() {
    super();
    this. _handleClick = this. _handleClick.bind(this);
  }

  render() { 
    return <div onClick={this._handleClick}>Hello, world.</div>;
  }
  _handleClick() {
    console.log(this); // this is undefined
  }
}


export default ExampleComponent;

