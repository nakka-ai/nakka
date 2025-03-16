import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  model: z.string(),
  metadata: z.record(z.any()),
  createdAt: z.string(),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const ChatNodeSchema = z.object({
  id: z.string(),
  message: ChatMessageSchema.optional(),
  parent: z.string().optional(),
  children: z.array(z.string()),
})

export type ChatNode = z.infer<typeof ChatNodeSchema>

export const ChatConversationDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  rootNodeId: z.string().optional(),
  currentNodeId: z.string().optional(),
  mapping: z.array(ChatNodeSchema),
  updateTime: z.string(),
  createdAt: z.string(),
})

export type ChatConversationData = z.infer<typeof ChatConversationDataSchema>

export class ChatConversation {
  data!: ChatConversationData
  branch?: string

  constructor(data?: Partial<ChatConversationData>) {
    if (!data) {
      this.parse({
        id: this.generateId(),
        title: 'New Conversation',
        mapping: [],
        createdAt: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      } as ChatConversationData)
    } else {
      this.parse(data)
    }
  }

  async parse(data: any) {
    this.data = ChatConversationDataSchema.parse(data)
  }

  generateId() {
    return uuidv4()
  }

  addMessage(
    message: {
      id?: string
      role: 'user' | 'assistant' | 'system'
      model: string
      content?: string
      metadata?: Record<string, any>
      createdAt?: string
    },
    // message: Partial<ChatMessage>,
    prevNode?: ChatNode
  ) {
    const node: Partial<ChatNode> = {}
    const children = node.children || []
    const parentId = prevNode?.id || node.parent
    // console.log('a', { parentId, prevNode, node })
    
    const lastNode = this.nodes[this.nodes.length - 1]
    let isRoot = false
    if (!parentId) {
      if (!lastNode) isRoot = true
    }

    const nodeId = node.id || this.generateId()
    const data: ChatNode = {
      id: nodeId,
      children,
      parent: isRoot ? undefined : (parentId || lastNode.id),
      message: {
        // ...message,
        id: nodeId,
        model: message.model,
        role: message.role || 'user',
        content: message.content || '',
        metadata: message.metadata || {},
        createdAt: new Date().toISOString(),
      }
    }
    this.data?.mapping.push(data)
    if (prevNode) {
      prevNode.children.push(data.id)
    } else if (lastNode) {
      lastNode.children.push(data.id)
    }

    if (isRoot) {
      this.data.rootNodeId = data.id
    }
    this.data.currentNodeId = data.id

    // update conversation
    this.updateBranch(data, true)

    // return
    return data
  }

  updateBranch(node?: ChatNode, forceBranch?: boolean) {
    // if this branch not set
    if (!this.branch || forceBranch) {
      if (!node) node = this.data.mapping[this.data.mapping.length - 1]
      const tree = this.tree
      for (const branch of tree) {
        const lastNode = branch.nodes[branch.nodes.length - 1]
        if (lastNode.id === node.id) {
          this.branch = branch.branchNodeStartId
          break
        }
      }
    }
  }
  
  get nodes() {
    // console.log(this.conversation.data)
    // console.log('awe1')
    if (this.tree.length === 0) return []
    // console.log('awe2')
    const tree = this.tree.find(t => t.branchNodeStartId === this.branch)
    if (!tree) return []
    // console.log('awe3')
    return tree.nodes
    // if (!this.conversation.data || !this.conversation.data.currentNodeId) return []
    // const nodes = this.conversation.data.mapping
    // return nodes
  }

  get tree() {
    const tree: {
      nodeIds: string[]
      nodes: ChatNode[]
      nodeStartId: string
      branchNodeStartId: string
      parent?: ChatNode
      isRoot?: boolean
      rootBranchId?: string
      branchChildren?: string[]
    }[] = []
    const nodes = this.data.mapping || []

    let nodeI = 0
    for (const node of nodes) {
      // undefined parent means root
      if (!node.parent) {
        tree.push({
          nodeIds: [node.id],
          nodes: [node],
          nodeStartId: node.id,
          branchNodeStartId: node.id,
          isRoot: true
        })
        continue
      }

      // check if parent is in tree, in must last node
      let isFoundInBranch = false
      for (const branch of tree) {
        const lastNode = branch.nodes[branch.nodes.length - 1]
        if (lastNode.id === node.parent) {
          branch.nodeIds.push(node.id)
          branch.nodes.push(node)
          isFoundInBranch = true
          break
        }
      }

      // if not found, create new branch
      if (!isFoundInBranch) {
        // before add this node, we need get parent this node and copy branch to new branch and add this node
        for (const branch of tree) {
          const parent = branch.nodes.find(n => n.id === node.parent)
          const beforeParent = branch.nodes.find(n => n.id === parent?.parent)
          if (parent?.id === node.parent) {
            // copy branch, but from start until parent only
            const nodesFromStartUntilParent = branch.nodes.slice(0, branch.nodes.indexOf(parent) + 1)
            const nodeIdsFromStartUntilParent = branch.nodeIds.slice(0, branch.nodeIds.indexOf(parent.id) + 1)
            const newBranch = {
              nodeIds: [...nodeIdsFromStartUntilParent, node.id],
              nodes: [...nodesFromStartUntilParent, node],
              // nodeIds: [node.id],
              // nodes: [node],
              nodeStartId: branch.nodeStartId,
              branchNodeStartId: node.id,
              parent: parent,
              rootBranchId: branch.rootBranchId || branch.nodeStartId,
            }
            branch.branchChildren ||= []
            branch.branchChildren.push(newBranch.branchNodeStartId)
            tree.push(newBranch)
            break
          }
        }
      }
    }

    return tree
  }

  // ? get possible branchs of node
  // ? if branch contains children > 1, then is have branch
  getBranchFromParentNode(nodeId: string) {
    const node = this.data.mapping.find(n => n.id === nodeId)
    if (!node) return []
    const parent = this.data.mapping.find(n => n.id === node.parent)
    if (!parent) return []
    const children = parent.children
    return children
  }

  getCurrentBranchIndexChildrenFromParentNode(nodeId: string) {
    this.updateBranch()
    const parentChildrenCurrentBranch = this.getBranchFromParentNode(nodeId)
    const tree = this.tree.find(t => t.parent?.children === parentChildrenCurrentBranch)
    if (!tree) return 0
    return tree.parent?.children.indexOf(nodeId) || 0
  }

  changeBranchFromNode(direction: 'left' | 'right', nodeId: string) {
    this.updateBranch()

    const parentChildrenCurrentBranch = this.getBranchFromParentNode(nodeId)
    const tree = this.tree.find(t => t.parent?.children === parentChildrenCurrentBranch)
    if (!tree || !tree.parent?.children) return
    
    const index = tree.parent.children.indexOf(nodeId)

    // console.log(index, [...tree.parent.children])

    let nextIndex = 0
    // handle next index is left or right
    if (direction === 'left') {
      nextIndex = index - 1
    } else {
      nextIndex = index + 1
    }
    // handle if next index is out of range
    if (nextIndex >= tree.parent.children.length) {
      return
    } else if (nextIndex < 0) {
      return
    }

    const selectedChildId = tree.parent.children[nextIndex]

    // if selected child is new branch from node
    const branchIsNewFromNode = this.tree.find(b => (b.branchNodeStartId === selectedChildId && b.parent?.children.includes(selectedChildId)))
    if (branchIsNewFromNode) {
      this.branch = branchIsNewFromNode.branchNodeStartId
      console.log('pilih tree ini 1', selectedChildId, branchIsNewFromNode)
      return selectedChildId
    }

    // ? except selected child is new branch from node, we must check in another branch?
    // ! need to work
    // Handle jika ingin kembali ke root branch
    const childrenWithoutSelectedChild = tree.parent.children.filter(c => c !== selectedChildId)
    // console.log('childrenWithoutSelectedChild', childrenWithoutSelectedChild)
    for (const b of this.tree) {
      if (b.branchChildren) {
        let ok = true
        // for (const bc of b.branchChildren || []) {
        //   if (!childrenWithoutSelectedChild.includes(bc)) {
        //     ok = false
        //     break
        //   }
        // }
        for (const c of childrenWithoutSelectedChild) {
          if (!b.branchChildren.includes(c)) {
            ok = false
            break
          }
        }
        if (ok) {
          this.branch = b.branchNodeStartId
          console.log('pilih tree ini 2', childrenWithoutSelectedChild, b.branchChildren)
          return selectedChildId
        }
      }
    }
  
    console.log('pilih tree ini 3', selectedChildId, childrenWithoutSelectedChild);

    return selectedChildId
  }
}