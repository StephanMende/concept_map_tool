import axios from "@/config/custom_axios";
import loginAxios from "@/config/login_axios"

const state = () => ({
    nodes: [], // stores the nodes of concept map
    concept_maps:[], // Stores the concept maps of the user
    index : 0, // the index of concept_maps. We use it for D3-network in ConceptMap.vue
    aktive_concept_map:[], // the selected concept map from radio button which are at the top right of the concept map page
    
})

const getters = {
    /** Getter for nodes of the concept map
    * @param {object} state state as parameter for access and manipulation of state data
    * @returns nodes 
    */
    getNodes(state) {
        return state.nodes;
    },
    
    /** Gets a variable if there is concept in map, returns a boolean
    * @param {object} state, state as parameter for access and manipulation of state data
    * @returns result, if concept map is free, then it returns false vice versa.
    * 
    */
    getIsConceptMapEmpty(state){
        let result = false;
        console.log(state.aktive_concept_map);
        // console.log(state.aktive_concept_map.nodes);
        (state.aktive_concept_map.nodes.length == 0) ? result =  true : result = false; 
        return result;
    },
    
    /**
    * Getter for concept_maps in state
    * @param {object} state, state as parameter for access and manipulation of state data 
    * @returns concept_maps, concept maps from state
    */
    getConceptMaps(state){
        return state.concept_maps;
    },
    /**
    * Getter for index value in state
    * @param {object} state, state as parameter for access and manipulation of state data 
    * @returns index, we are using it in concept_maps array.
    */
    getIndex(state){
        return state.index;
    },
    
    
}

const actions = { 
    
    /**
    * Sends concept map to database.
    * It also triggers the action to save it in the user.
    * @param {*} commit, commit is being used to call a mutation
    * @param {*} dispatch, dispatch is being used to call an aciton
    * @param {object} conceptMap,the concept map, to save in database and state
    */
    async createConceptMap({state, commit, dispatch},conceptMap){
        await commit("CREATE_CONCEPT_MAP", conceptMap)
        let index = state.concept_maps.indexOf(conceptMap);
        await commit("UPDATE_INDEX", index);
        var data = `{"data": {"type": "node--concept_map",
        "attributes": {"title": "${conceptMap.title}"}}}`;
        var config = {
            method: 'post',
            url: 'concept_map',
            data: data
        };
        axios(config)
        .then((response)=>{
            dispatch("addConceptMapToUser", response.data.data)
        })
        .catch((error) => {
            console.log(error)
        })
        
    },
    /**
    * Adds concept map id to the user in database.
    * @param {rootState} rootState, it allows access to states of other modules in store
    * @param {object} conceptMap, the concept map to save to user in database. 
    */
    addConceptMapToUser({rootState }, conceptMap){
        console.log(conceptMap);
        let userId = rootState.drupal_api.user.id;
        console.log(userId);
        var data = `{
            "data": [{
                "type": "node--concept_map",
                "id": "${conceptMap.id}"
            }]
        }`;
        var config = {
            method: 'post',
            url: `jsonapi/user/user/${userId}/relationships/field_concept_maps`,
            headers: {
                'Authorization': rootState.drupal_api.authToken,
                'X-CSRF-Token': `${rootState.drupal_api.csrf_token}`
            },
            data: data
        };
        loginAxios(config)
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error)
        })
    },
    
    /**
    * Saves concept to the concept map in database 
    * commits to save concepts to the concept map in state.
    * @param {object} concept the concept that will be added to concept map 
    */
    addConceptToConceptMap({commit, state}, payload) {
        let id = state.aktive_concept_map.id;
        let concept = payload.concept;
        
        // We need to control if our concept is already in the map. 
        // Thats why We need the variables below
        let nodesInMap = state.aktive_concept_map.nodes; 
        let isMapConsist = false;
        console.log(nodesInMap);
        // If our concept is in map, this loop returns isMapConsist true
        nodesInMap.forEach(node => {
            if(node.id == concept.id) isMapConsist = true;
        });
        // If concept is not in the concept map, we are adding it to the concept map. 
        if(!isMapConsist){
            // send it to mutations to save to the state
            commit('ADD_CONCEPT_TO_CONCEPT_MAP', payload);
            // save to db
            // It is now working. We send the concept to the conept map. 
            var data = `{"data": [{
                "type": "node--concept", 
                "id": "${concept.id}"
            }]}`;
            var config = {
                method: 'post',
                url: `concept_map/${id}/relationships/field_conceptmap_concepts`,
                
                data: data
            };
            axios(config)
            .then((response)=>{
                console.log(response);
            })
            .catch((error) => {
                console.log(error)
            })
            
        }
        
    }, 
    /**
    * Deletes node from concept map in concept map database and
    * commits to delete node from concept map in state. 
    * @param {object} node the node that will be deleted from concept map. 
    * 
    */
    deleteNodeFromConceptMap({commit, state}, payload){
        commit('DELETE_NODE_FROM_CONCEPT_MAP', payload);
        // Deleting node from concept map in database
        var data = `{"data": [{
            "type": "node--concept", 
            "id": "${payload.node.id}"
        }]}`;
        var config = {
            method: 'delete',
            url: `concept_map/${state.aktive_concept_map.id}/relationships/field_conceptmap_concepts`,
            data: data
        };
        axios(config)        
    },
    
    /**
    * Deletes the link from both state and database.
    * Deletes it in both relationships table and concept map table.
    * At the end it controls if there is a link with id missing created.
    * It somehow creates links with id "missing". I could not prevent it. 
    * I have tried to make this process in seperate actions and functions and try to call them
    * in an order with then blocks. I have tried to delete first from concept map and then in relationship table
    * But somehow it creates the links with id missing in concept map table. I could not prevent it.
    * So as a solution the function checks at the end if they are created and delete them immediately.
    * @param {object} payload it stores the lind ids of the links that we are going to delete from backend.
    * @param {*} state, state as parameter for access and manipulation of state data
    * @param {*} commit, commit is being used to call a mutation
    */
    deleteLinkFromConceptMap({commit, state}, payload){
        // state delete
        commit("DELETE_LINK_FROM_STATE", payload);
        
        // To make it seperate
        // var data = `{"data": [{
        //     "type": "node--relationship",
        //     "id": "${linkId}"             
        // }]}`;
        // var config = {
        //     method: 'delete',
        //     url: `concept_map/bd8c18f3-4f03-4787-ac85-48821fa3591f/relationships/field_conceptmap_relationships`,
        
        //     data: data
        // };
        // axios(config).then(()=>{
        //     dispatch("deleteLinkFromRelationsTable", linkId);
        // })
        
        
        
        
        // Delete relationship from Concept map in database
        var data = `{"data": [{
            "type": "node--relationship",
            "id": "${payload.linkId}"             
        }]}`;
        var config = {
            method: 'delete',
            url: `concept_map/bd8c18f3-4f03-4787-ac85-48821fa3591f/relationships/field_conceptmap_relationships`,
            
            data: data
        };
        axios(config)
        .then(()=> {
            
            // Delete relationship from relationships in db
            // We need to delete relationship from relationship table after we delete it from conceptmap
            // Thats why we make it here
            // But it does not do it in order. Thats why we had to do many extra work. 
            // It creates relationship with no reference in conceptmap.json file. 
            // We delete them regularly when we initialize the concept map and after this delete process. 
            // If we could make it here in order. Then we would be released so much work.  
            var data2 = `{"data": [{
                "type": "node--relationship",
                "id": "${payload.linkId}" 
                
            }]}`;
            var config2 = {
                method: 'delete',
                url: `relationship/${payload.linkId}`,
                
                data: data2
            };
            axios(config2)
            .then(() => {
                
                // Check if there is a missing created and delete it.
                var data = `{"data": [{
                    "type": "node--relationship",
                    "id": "missing"                             
                }]}`;
                var config = {
                    method: 'delete',
                    url: `concept_map/${state.aktive_concept_map.id}/relationships/field_conceptmap_relationships`,
                    
                    data: data
                };
                axios(config)
                .then(() => {
                    console.log("missing deleted")
                })
                .catch(function (error) {
                    console.log(error)
                })
                
            })
            .catch(function (error) {
                console.log(error)
            })            
        })
        .catch(function (error) {  
            console.log(error)
        })
        
    },
    
    deleteLinkFromRelationsTable(linkId){
        console.log("Link ID === ????")
        console.log(linkId);
        var data2 = `{"data": [{
            "type": "node--relationship",
            "id": "${linkId}" 
            
        }]}`;
        var config2 = {
            method: 'delete',
            url: `relationship/${linkId}`,
            
            data: data2
        };
        axios(config2)
    },
    
    /**
    * commits to add links to the concept map.
    * @param {*} commit, commit is being used to call a mutation
    * @param {*} state, state as parameter for access and manipulation of state data
    * @param {array} relationship the link that will be added to the concept map 
    */
    addRelationshipToDatabase({commit, state}, payload) {
        // send it to state
        commit('ADD_RELATIONSHIP_TO_STATE', payload)
        var data = `{"data":{
            "type": "node--relationship", 
            "attributes":{"title": "${payload.relationship[0].name}", 
            "field_sid": "${payload.relationship[0].sid}", 
            "field_tid": "${payload.relationship[0].tid}" 
        }}}`;
        var config = {
            method: 'post',
            url: 'relationship',
            data: data
        };
        axios(config)
        .then((response)=> {
            // we need to save the id of the relationship to the state.
            // We will use the id when we delete it. 
            // Now there is an id like "link-0" in state. We cannot delete relationship with this id. 
            // Thats why we send it to state here.
            
            // I cant send the newRelationId to mutation. Thats why I am doing it here.
            // commit('ADD_RELATIONSHIP_TO_DATABASE', relationship, response.data.data.id);
            let newRelationId = response.data.data.id;
            // update the id of the link in state
            state.concept_maps[state.index].links.forEach(link => {
                if(link.name == payload.relationship[0].name){
                    link.id = response.data.data.id;
                }
                
            });
            // Adding Realtionship to our concept map in database
            var data = `{"data": [{
                "type": "node--relationship",
                "id": "${newRelationId}"                
            }]}`;
            var config = {
                method: 'post',
                url: `concept_map/${state.aktive_concept_map.id}/relationships/field_conceptmap_relationships`,
                data: data       
            };
            axios(config)
            
        })
        .catch(function (error) {
            console.log(error)
        })
    },
    /**
    * Loads concept map from backend. 
    * It takes the concept map from backend and this concept maps stores the ids of nodes and links.
    * It calls another actions to take the datas of the nodes and links. 
    * Then it makes them together and sends it to mutation to save it in state.
    *  @param {*} commit, it is being used to call a mutation
    *  @param {*} rootState, it allows access to states of other modules in store.
    *  @param {*} dispatch, it is being used to call an action
    */
    async loadConceptMapFromBackend({commit, rootState, dispatch}) {
        let conceptMaps = rootState.drupal_api.user.concept_maps;
        let index = conceptMaps.length - 1;
        commit("UPDATE_INDEX", index); 
        return conceptMaps.forEach( async (conceptMap) => {
            await axios.get(`concept_map/${conceptMap.id}`)
            .then(async (response) => {  
                console.log(response)
                const nodes = response.data.data.relationships.field_conceptmap_concepts.data;
                const links = response.data.data.relationships.field_conceptmap_relationships.data;
                let newNodes = await dispatch("loadNodesOfConceptMap", nodes);
                let newLinks = await dispatch("loadLinksOfConceptMap", links);
                await dispatch("loadConceptMap", {conceptMapCredientials: response.data.data, nodes:newNodes, links:newLinks});
                await commit("INITIALIZE_AKTIVE_CONCEPT_MAP");      
            })
            .catch(error => {
                throw new Error(`API ${error}`);
            });    
        })    
    },
    
    /**
    * Loads the node data of the concept maps from database.
    * @param {*} state, state as parameter for access and manipulation of state data 
    * @param {*} nodes, it stores the ids of the nodes.  
    * @returns {object} concepts, it stores the concept ids, titles and uuids.
    */
    async loadNodesOfConceptMap({state}, nodes){
        console.log(state)
        let concepts = [];
        await nodes.forEach(element => {
            axios.get(`concept/${element.id}`)
            .then((response) => {
                const title = response.data.data.attributes.title;
                const uuid = response.data.data.id;
                concepts.push({id: uuid, name: title, uuid: uuid});
            })     
        });
        console.log(concepts);
        return concepts;
    },
    /**
    * Loads the link data of the concept maps from database.
    * @param {*} state, state as parameter for access and manipulation of state data 
    * @param {*} links, it stores the ids of the links.  
    * @returns {object} concepts, it stores the links ids, names,source ids(sid) and target ids(tid)
    */
    async loadLinksOfConceptMap({state}, links){
        console.log(state)
        let relationships = [];
        await links.forEach(link => {
            axios.get(`relationship/${link.id}`)
            .then((response) => {
                const label = response.data.data.attributes.title;
                const id = response.data.data.id;
                const sid = response.data.data.attributes.field_sid;
                const tid = response.data.data.attributes.field_tid;
                // state.links.push({ id: id, sid: sid, tid: tid, _color: '#c93e37', name: label})
                relationships.push({ id: id, sid: sid, tid: tid, _color: '#c93e37', name: label})
            })
        })
        console.log(relationships)
        return relationships;
    },
    /**
    * Sends concept map to mutation to save it in state. 
    * @param {*} commit, it is being used to call a mutation 
    * @param {object} conceptMap, it stores the concept map to save the state 
    * @returns 
    */
    async loadConceptMap({commit}, conceptMap){
        return await commit('INITIALIZE_CONCEPT_MAP', conceptMap);
    }, 
    
    
}

const mutations = {
    /**
    * Saves concept map to the state and 
    * @param {*} state 
    * @param {*} conceptMap 
    */
    CREATE_CONCEPT_MAP(state, conceptMap){
        return state.concept_maps.push(conceptMap);
        // let index =
        // state.concept_maps.indexOf(conceptMap);
        // commit("UPDATE_INDEX", index);
    },
    /**
     * 
     * @param {*} state, state as variable to access and manipulation of state data 
     * @param {*} index, the new index to save
     * @returns 
     */
    UPDATE_INDEX(state, index){
        return state.index = index;
    },
    
    /**
    * Adds concept to concept map in state,
    * @param {*} state 
    * @param {object} payload stores the concept data for adding it to concept map. 
    */
    ADD_CONCEPT_TO_CONCEPT_MAP(state, payload) {  
        state.concept_maps[state.index].nodes.push({
            id: payload.concept.id,
            name: payload.concept.name,
            uuid: payload.concept.id,        
        })            
    },
    /**
    * Adds relationships to the concept map. 
    * Both state and database
    * It saves first to the database and then saves relationship to state by using the id 
    * that comes with response.
    * @param {*} state 
    * @param {array} payload stores the relationship that will be added to concept map. 
    */
    ADD_RELATIONSHIP_TO_STATE(state, payload) {  
        state.concept_maps[state.index].links.push({
            sid: payload.relationship[0].sid,
            tid: payload.relationship[0].tid,
            _color: '#FFFFFF', 
            name: payload.relationship[0].name,
        })       
    },
    
    
    /**
    * Deletes node from concept map. 
    * @param {*} state 
    * @param {object} payload stores the node that will be deleted from concept map 
    */
    DELETE_NODE_FROM_CONCEPT_MAP(state, payload){
        // delete node in state
        console.log(payload);
        console.log(state);
        let indexOfNode = state.concept_maps[state.index].nodes.indexOf(payload.node);
        console.log(indexOfNode);
        state.concept_maps[state.index].nodes.splice(indexOfNode, 1);
        
    },
    /**
    * Deletes the link from concept map. 
    * @param {*} state 
    * @param {object} payload stores The id of the node which the link associated with it, will be deleted. 
    *  
    */
    
    DELETE_LINK_FROM_STATE(state, payload){
        // Delete relationship from state
        console.log("payload in delete link")
        console.log(payload);
        state.concept_maps[state.index].links.forEach(link => {     
            if(link.id == payload.linkId){
                // Delete from state
                state.concept_maps[state.index].links.splice(state.concept_maps[state.index].links.indexOf(link), 1); 
            }            
        });        
    },
    
    /**
    * Loads concept map to the state
    * Loads nodes and link in the required form for vue-d3-network
    * @param {*} state 
    * @param {object} conceptMap the concept map that we load from database. 
    */
    INITIALIZE_CONCEPT_MAP(state, conceptMap) {
        return state.concept_maps.push({
            id: conceptMap.conceptMapCredientials.id, 
            title:conceptMap.conceptMapCredientials.attributes.title, 
            nodes:conceptMap.nodes, 
            links:conceptMap.links
        })
        
        
    },
    /**
     * 
     * @param {*} state, state as parameter to access and manipulation of state data 
     * @returns state.aktive_concept_map
     */
    INITIALIZE_AKTIVE_CONCEPT_MAP(state){
        
        return state.aktive_concept_map = state.concept_maps[0];
    },
    
    
    
    
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
