@Backlog @JIRAKEY-9123 @quicksearch
Feature: [JIRAKEY-9123] Quick Search by ID

    
    In order to be able to quickly display an entity
    As a user
    I should have access to a quicksearch by ID component
    where I should be able to type the ID of an entity
    and press the enter key or click the "Search" button.

    h1. Heading 1
    h2. Heading 2
    h3. Heading 3
    h4. Heading 4
    h5. Heading 5
    h6. Heading 6

    Requirements
    --------------
    * The textbox should be visible, with no value
    * The search and reset buttons should not be visible
    * When the user types a search term, the "Search" and "Reset" button should become visible
    * When the user clicks the "Reset" button, the textbox should clear
    * When the user clicks the "Search" button OR presses the ENTER key, a search is performed:
        - If an entity with the ID is found, the user should be redirected to the entity's page, and the searchbox should return to its initial state
        - If an entity with the given ID is not found, the border of the textbox should become red, indicating an error.

	
	| Tables        | Are           | Cool  |
	| ------------- |---------------| ------|
	| col 3 is      | right-aligned | $1600 |
	| col 2 is      | centered      |   $12 |
	| zebra stripes | are neat      |    $1 |
    
    Background: This is the Background 
        Given something
        And something else

    @MainFlow
    Scenario: Check Default State

    This is a sample scenario description

        Given I access the application
        Then The Quick Search textbox should be visible
        And The Quick Search textbox should have the value ''
        And The Quick Search button should not be visible
        And The Quick Search reset button should not be visible
    
    Scenario: Check Buttons' visibility when a search term is typed
        Given I access the application
			|something|action|should|but|
			|ssssssss1|aaaaa1|shoul1|bu1|
			|ssssssss2|aaaaa2|shoul2|bu2|
			|ssssssss3|aaaaa3|shoul3|bu3|
        When I type 'test' in the Quick Search textbox
        Then The Quick Search button should be visible
        And The Quick Search reset button should be visible
        
    @AlternativeFlow(1)
    Scenario: Reset search

    @AlternativeFlow(2) @Minor
    Scenario: ID not found
    
    @Security 
    Scenario Outline: Search for valid ID
		Given some <something>
		When I do <action> 
		Then I should <should>
		But I <but>
	Examples:
		|something|action|should|but|
		|ssssssss1|aaaaa1|shoul1|bu1|
		|ssssssss2|aaaaa2|shoul2|bu2|
		|ssssssss3|aaaaa3|shoul3|bu3|