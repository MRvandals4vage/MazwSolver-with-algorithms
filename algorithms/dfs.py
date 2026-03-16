# pyre-ignore-all-errors
import pygame, time, argparse, csv # type: ignore
import numpy as np # type: ignore
from time import sleep

# function to check if a position is in the grid
# Returns true if the position is in the grid and false if not
def is_in_grid(pos, grid_dim):
    (max_x, max_y) = grid_dim # unroll the dimensions
    (x, y) = pos # unroll the position coordinates
    return bool((x <= max_x) and (x >= 0) and (y <= max_y) and (y >= 0)) # only true if both true

# Class to represent a node in the grid
class Node:
    def __init__(self, pos, parent):
        self.x = pos[0]
        self.y = pos[1]
        self.parent = parent

# class for DFS
class DFS:
    def __init__(self, start, goal, grid_dim):
        self.start = start
        self.goal = goal
        self.dim = grid_dim
        self.openlist = []
        self.openlist.append(Node(start, None))
        self.closedlist = []

    def get_path(self, node):
        path = []
        while node.parent != None:
            path.append((node.x, node.y))
            node = node.parent
        return path

    def child_gen(self, grid):
        curr = self.openlist.pop(0)
        x,y = curr.x, curr.y

        neighbors = [(x+1,y), (x-1,y), (x,y+1), (x,y-1)]
        for neighbor in neighbors:
            if (is_in_grid(neighbor, self.dim) and (grid[neighbor[0], neighbor[1]] in [1, 3])): # type: ignore
                next_node = Node(neighbor, curr)
                self.openlist.insert(0, next_node) # type: ignore
                if (neighbor == self.goal): # type: ignore
                    self.closedlist.append(next_node) # type: ignore
                    return self.get_path(next_node), True # type: ignore
                    
        self.closedlist.append(curr) # type: ignore
        return [], False

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
    # example: python dfs.py --display=1 --maze_file=maze_1.csv
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

    # define start and goal
    grid[0, 0] = 2
    grid[-1, -1] = 3

    grid_dim = (num_rows-1, num_columns-1)

    if args.display == 1:
        # initialize pygame
        pygame.init()

        # congiguration of the window
        WINDOW_SIZE = [535, 535]
        screen = pygame.display.set_mode(WINDOW_SIZE)
        # screen title
        pygame.display.set_caption(f"Solving using DFS: {address}")

        done = False # loop until done
        run = False # when run = True start running the algorithm
        close = False

        clock = pygame.time.Clock() # to manage how fast the screen updates

        idx_to_color = [black, white, green, red, blue, path]

        dfs = DFS(start, goal, grid_dim)

        # define start and goal
        grid[0, 0] = 2 # (0,0)
        grid[-1, -1] = 3 # (num_rows-1, num_rows-1)

        # main program
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
                child_gen, done = dfs.child_gen(grid)
            
                explored = [(node.x, node.y) for node in dfs.closedlist]

                for pos in explored:
                    grid[pos[0], pos[1]] = 4

            if done == True:
                for pos in child_gen:
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
        print(f"Solving using DFS: {address}")
        dfs = DFS(start, goal, grid_dim)
        done = False

        while not done:
            child_gen, done = dfs.child_gen(grid)
            
        explored = [(node.x, node.y) for node in dfs.closedlist]

        for pos in explored:
            grid[pos[0], pos[1]] = 4

        for pos in child_gen:
            grid[pos[0], pos[1]] = 5

        grid[0, 0] = 2
        grid[-1, -1] = 3

        print("Solved!")

    # export the child_gen to a csv file
    csv_path = f"../mazes_output/dfs/dfs_{args.maze_file}"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(grid)

    import json
    history = {
        "explored": [[int(pos[0]), int(pos[1])] for pos in explored],
        "path": [[int(pos[0]), int(pos[1])] for pos in child_gen] if child_gen else []
    }
    with open(csv_path.replace('.csv', '.json'), "w") as f:
        json.dump(history, f)

    print(f"--- finished {time.time()-start_time:.3f} s---")
    exit(0)
