# pyre-ignore-all-errors
import pygame, time, argparse, csv # type: ignore
import numpy as np # type: ignore
from time import sleep
from queue import PriorityQueue
from itertools import count

# Node class for A* algorithm
class Node:
    def __init__(self, parent, g, cost, position):
        self.parent = parent
        self.g = g
        self.f = cost
        self.position = position

# function to check if a position is in the grid
# Returns true if the position is in the grid and false if not
def is_in_grid(pos, grid_dim):
    (max_x, max_y) = grid_dim # unroll the dimensions
    (x, y) = pos # unroll the position coordinates
    return (x <= max_x) and (x >= 0) and (y <= max_y) and (y >= 0) # only true if both true

# class for A* algorithm
class AStar:
    def __init__(self, grid, start, goal, grid_dim):
        self.grid = grid
        self.start = start
        self.goal = goal
        self.grid_dim = grid_dim
        self.open_list = PriorityQueue()
        self.closed_list = []
        self.path = []

    # function to calculate the cost of a node using the heuristic function (Euclidean distance)
    def heuristic1(self, pos):
        x, y = pos
        x_goal, y_goal = self.goal
        cost = np.sqrt((x_goal-x)**2 + (y_goal-y)**2)
        return cost

    # function to calculate the cost of a node using the heuristic function (Manhattan distance)
    def heuristic2(self, pos):
        x, y = pos
        x_goal, y_goal = self.goal
        cost = abs(x_goal-x) + abs(y_goal-y)
        return cost

    # function to generate the children of a node
    def generate_children(self, node, heuristic):
        moves = [(0, 1), (0, -1), (1, 0), (-1, 0)] # possible moves
        x, y = node.position # unroll the position coordinates
        children = []

        # loop through all possible moves
        for move in moves:
            next_node = (x + move[0], y + move[1]) # calculate the next node position
            if is_in_grid(next_node, self.grid_dim):
                # check if the next node is not a wall
                if self.grid[next_node] != 0 and next_node not in self.closed_list:
                    # create a new node
                    if heuristic == 1:
                        h = self.heuristic1(next_node)
                    else: 
                        h = self.heuristic2(next_node)
                    g = node.g + 1
                    f = g + h
                    new_node = Node(node, g, f, next_node)
                    children.append(new_node)

        return children

    # function to solve the maze using A* algorithm with Euclidean distance
    def solution1(self):
        unique = count()
        # create the start node
        h = self.heuristic1(self.start)
        g = 0
        f = h + g
        start_node = Node(None, g, f, self.start)
        self.open_list.put((f, next(unique), start_node))
        while True:
            curr = self.open_list.get()[2] # get the node with the lowest cost
            if curr.position == self.goal:
                while curr is not None:
                    self.path.append(curr.position)
                    curr = curr.parent
                self.path.reverse()
                return self.path, True
            for child in self.generate_children(curr,1):
                if child not in self.closed_list:
                    self.open_list.put((child.f, next(unique), child))
            self.closed_list.append(curr.position)  
        return self.path, False

    # function to solve the maze using A* algorithm with Manhattan distance
    def solution2(self):
        unique = count()
        # create the start node
        h = self.heuristic2(self.start)
        g = 0
        f = h + g
        start_node = Node(None, g, f, self.start)
        self.open_list.put((f, next(unique), start_node))
        while True:
            curr = self.open_list.get()[2]
            if curr.position == self.goal:
                self.path = []
                while curr is not None:
                    self.path.append(curr.position)
                    curr = curr.parent
                self.path.reverse()
                return self.path, True

            for child in self.generate_children(curr,2):
                if child not in self.closed_list:
                    self.open_list.put((child.f, next(unique), child))
            self.closed_list.append(curr.position)
        return self.path, False


if __name__ == "__main__":
    start_time = time.time()
    # define all colors of the grid RGB
    # grid == 0 for indicating wall
    black = (0, 0, 0) 
    # grid == 1 for inidicating space
    white = (255, 255, 255) 
    # grid == 2 for indicating start
    green = (0,255,128) 
    # grid == 3 for indicating goal
    red = (255,51,51) 
    # for background
    grey = (192,192,192) 
    # grid[x][y] == 4, where current position is
    blue = (153,200,255) 
    # grid[x][y] == 5, path taken
    path = (255,255,0)

    # set the height/width of each location on the grid (Square grid for now)
    height = 12
    width = height 
    margin = 1 # sets margin between grid locations

    # parsing user input
    # example: python astar.py --display=True --maze_file=maze_1.csv
    parser = argparse.ArgumentParser()
    parser.add_argument("--display", help="Display generating process 0: False, 1:True", default=1, type=int)
    parser.add_argument("--maze_file", help="filename (csv) of the maze to load.", default="maze_1.csv", type=str)
    args = parser.parse_args()

    address = "../mazes_input/" + args.maze_file
    grid = np.genfromtxt(address, delimiter=',', dtype=int)
    num_rows = len(grid)
    num_columns = len(grid[0])

    # define start, define goal
    start = (0,0)
    goal = (num_rows-1, num_columns-1)

    grid_dim = (num_rows-1, num_columns-1)

    if args.display == 1:
        # initialize pygame
        pygame.init()

        # congiguration of the window
        WINDOW_SIZE = [535, 535]
        screen = pygame.display.set_mode(WINDOW_SIZE)
        # screen title
        pygame.display.set_caption(f"Solving using Astar: {address}")

        done = False # loop until done
        run = False # when run = True start running the algorithm
        close = False

        clock = pygame.time.Clock() # to manage how fast the screen updates

        idx_to_color = [black, white, green, red, blue, path]

        astar = AStar(grid, start, goal, grid_dim)

        # define start and goal
        grid[0, 0] = 2
        grid[-1, -1] = 3
        
        while not done:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    done = True   
                # wait for user to press RETURN key to start    
                elif event.type == pygame.KEYDOWN:
                    if event.key==pygame.K_RETURN:
                        run = True
            
            screen.fill(grey) # fill background in grey
                
            # draw
            for row in range(num_rows):
                for column in range(num_columns):
                    color = idx_to_color[int(grid[row, column])] # type: ignore
                    pygame.draw.rect(screen, color, [(margin + width) * column + margin, (margin + height) * row + margin,width, height])

            # set limit to 60 frames per second
            clock.tick(60)
        
            # update screen
            pygame.display.flip()

            if run == True:
                sleep(0.01)
                solution,done = astar.solution1()
            
                explored = [node for node in astar.closed_list]

                for pos in explored:
                    grid[pos[0], pos[1]] = 4

            if done == True:
                for pos in solution:
                    grid[pos[0], pos[1]] = 5

                grid[0, 0] = 2
                grid[-1, -1] = 3

                screen.fill(grey) # fill background in grey
            
                for row in range(num_rows):
                    for column in range(num_columns):
                        color = idx_to_color[grid[row, column]] # type: ignore
                        pygame.draw.rect(screen, color, [(margin + width) * column + margin, (margin + height) * row + margin,width, height])

                clock.tick(60) # set limit to 60 frames per second
                pygame.display.flip() # update screen

        
        print("Solved! Click exit.")
        while not close:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    close = True
                # wait for user to press any key to start    
                elif event.type == pygame.KEYDOWN:
                    close = True
        pygame.quit()

    else:
        print(f"Solving using Astar: {address}")
        astar = AStar(grid, start, goal, grid_dim)

        solution,done = astar.solution1()

        explored = [node for node in astar.closed_list]

        for pos in explored:
            grid[pos[0], pos[1]] = 4

        for pos in solution:
            grid[pos[0], pos[1]] = 5

        grid[0, 0] = 2
        grid[-1, -1] = 3

    # export maze to .csv file
    csv_path = f"../mazes_output/astar/astar_{args.maze_file}"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(grid)

    import json
    history = {
        "explored": [[int(pos[0]), int(pos[1])] for pos in explored],
        "path": [[int(pos[0]), int(pos[1])] for pos in solution]
    }
    with open(csv_path.replace('.csv', '.json'), "w") as f:
        json.dump(history, f)

    print(f"--- finished {time.time()-start_time:.3f} s---")
    exit(0)






