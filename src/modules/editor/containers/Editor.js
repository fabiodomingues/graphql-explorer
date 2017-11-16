import React from 'react'
import { connect } from 'react-redux'
import { compose, withHandlers } from 'recompose'
import { Layer, Stage } from 'react-konva'
import windowDimensions from 'react-window-dimensions'

import Node from '../components/Node'
import Edge from '../components/Edge'
import ConnectorEdge from '../containers/ConnectorEdge'

import {
  addEdge,
  addField,
  updateStage,
  updateNode,
  selectNode,
  getSelectedNode,
  getConnectedNode,
  updateConnector,
  resetConnector,
} from '../store'

// @TODO Convert all these handlers to use withHandlers.
const handleDragStage = dispatch => function (pos) {
  dispatch(updateStage({ pos }))
  return pos
}

const handleDrag = ({ name, dispatch }) => function (pos) {
  dispatch(updateNode({ name, pos }))
  return pos
}

const handleDoubleClick = ({ name, dispatch }) => event => {
  dispatch(updateConnector({ isConnecting: true }))
}

const handleMouseOver = ({ name, selectedNode, connector: { isConnecting }, dispatch }) => event => {
  if (isConnecting && selectedNode.name !== name) {
    dispatch(updateConnector({ connectedTo: name }))
  }
}

const handleMouseOut = ({ name, connector: { isConnecting, connectedTo }, dispatch }) => event => {
  if (isConnecting && name === connectedTo) {
    dispatch(updateConnector({ connectedTo: null }))
  }
}

const edgeIsActive = ({ edgeNodes, selectedNode = {} }) => edgeNodes
  .some(nodeName => (
    !selectedNode.hasOwnProperty('name') || nodeName === selectedNode.name
  ))

const Editor = ({
  width, height, nodes, edges, selectedNode, dispatch, cursorPosition, connector,
  onNodeClick: handleOnNodeClick, onStageClick: handleOnStageClick, ...rest
}) => {
  const style = {
    position: 'fixed'
  }

  return (
    <Stage
      draggable
      dragDistance={ 2 }
      dragBoundFunc={ handleDragStage(dispatch) }
      onClick={ handleOnStageClick }
      style={ style }
      width={ width }
      height={ height }
    >
      <Layer>
        { edges.map(({ name, points, type, nodes: edgeNodes }) => (
          <Edge
            key={ name }
            active={ edgeIsActive({ edgeNodes, selectedNode }) }
            type={ type }
            name={ name }
            points={ points }
          />
        ))}

        { connector.isConnecting &&
          <ConnectorEdge cursorPosition={ cursorPosition } />
        }

        { nodes.map(({ name, pos, selected, type }) => (
          <Node
            key={ name }
            name={ name }
            type={ type }
            selected={ selected }
            connector={ connector }
            draggable dragBoundFunc={ handleDrag({ name, dispatch }) }
            onClick={ handleOnNodeClick({ name }) }
            onDblclick={ handleDoubleClick({ name, dispatch }) }
            onMouseOver={ handleMouseOver({ name, selectedNode, connector, dispatch }) }
            onMouseOut={ handleMouseOut({ name, connector, dispatch }) }
            x={ pos.x }
            y={ pos.y }
          />
        )) }
      </Layer>
    </Stage>
  )
}

const onNodeClick = ({ dispatch, edges, selectedNode, connector, nodes }) => ({ name }) => event => {
  // Connecting Nodes.
  const { isConnecting, connectedTo } = connector
  if (isConnecting && connectedTo) {

    // @TODO Avoid to create same relations.
    // if (edgeName && !edges.some(edge => edge.name === edgeName)) {
    //   dispatch(addEdge({ name: edgeName }))
    // }

    const connectedToNode = getConnectedNode({ nodes, connectedTo })

    // Connection from: model to model node.
    if ([selectedNode, connectedToNode].every(({ type }) => type === 'model')) {
      const name = prompt("Name of the field?")
      const type = prompt("Type of the relation (hasMany, hasOne)?")

      dispatch(
        addField({ name, nodeA: selectedNode.name, nodeB: connectedTo, type })
      )
    }

    // Connection from: model to relation node.
    if (selectedNode.type === 'model' && connectedToNode.type === 'relation') {
      dispatch(
        addEdge({
          nodeA: selectedNode.name,
          nodeB: connectedTo,
          type: connectedToNode.cardinality
        })
      )
    }

    return dispatch(resetConnector())
  }

  // Selecting a Node.
  dispatch(selectNode({ name }))
}

const onStageClick = ({
  dispatch, connector: { isConnecting, connectedTo }
}) => event => (isConnecting && !connectedTo) && dispatch(resetConnector())

const mapStateToProps = ({ nodes, edges, connector }) => ({
  edges,
  nodes,
  selectedNode: getSelectedNode(nodes),
  connector,
})

export default compose(
  connect(mapStateToProps),
  windowDimensions(),
  withHandlers({ onNodeClick, onStageClick }),
)(Editor)
