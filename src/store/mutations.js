import axios from 'axios'

export const updateConcept = (state) => {
    // Concept update...
    state.push("data");
}


export const SAVE_CONCEPTS = (state, concepts) => {
    state.concepts = concepts;
}

/**
 * Saves concept name to database.
 * It takes the name of concept only. 
 * Then generate the proper format to save database.
 * 
 * @param {state} state  
 * @param {conceptName} conceptName to save database 
 */
export const ADD_NEW_CONCEPT = (state, conceptName) => {
    // Generating the proper format for database and sending it to database
    var data = `{"data":{"type":"node--concept", "attributes": {"title": "${conceptName}"}}}`;
    var config = {
        method: 'post',
        url: 'https://clr-backend.x-navi.de/jsonapi/node/concept',
        headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': 'Basic YWRtaW46cGFzc3dvcmQ='
        },
        data: data
    };

    // Sending concept to state
    axios(config)
        .then(function (response) {
            state.concepts.push({ name: conceptName, nid: response.data.data.attributes.drupal_internal__nid });
        })
        .catch(function (error) {
            console.log(error);
        });
}

/**
 * Deletes concept from state. 
 * @param {state} state 
 * @param {concept} concept that we are going to delete. 
 */
export const DELETE_CONCEPT = (state, concept) => {
    let index = state.concepts.indexOf(concept);
    state.concepts.splice(index, 1);
}

// DELETE_CONCEPT(state, concept) {
//     let index = state.concepts.indexOf(concept);
//     state.concepts.splice(index, 1);
// },