import React from 'react';
import ReactDOM from 'react-dom';

class App extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            file_list: []
        };
    }
    render(){
        const file_list = this.state.file_list;
        if (file_list.length === 0){
            return(
                <div id="drag-view">
                    <div id="drag-area">
                        +
                        <br/>
                        Drag file or folder to this area
                    </div>    
                </div>
            );
        }
        else{
            return (
                <div id="media-list-view">
                    <ul class="list-group" id="media-files-list">
                    </ul>
                    <div>
                        <button class="btn btn-primary" id="download-button">Download All</button>
                        <button class="btn btn-danger" id="remove-button" >Remove</button>
                    </div>
                </div>
            );
        }
    }    
}

ReactDOM.render(
    <App />,
    document.getElementById('root')
);