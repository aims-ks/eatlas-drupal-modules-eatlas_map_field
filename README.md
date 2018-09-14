#Map Field Module
##Taxonomy integration
In order to use the taxonomy module to add keywords to features the following steps need to be performed:
1. Create vocabulary  
Create a new vocabulary under '/admin/structure/taxonomy/add'. Choose a name and add a description.  
**Important:** The machine name has to be 'eatlas_field_map_vocabulary'
2. Create openlayer style field  
To be able to add styles to keywords a new field needs to be added to the vocabulary.  
Select the vocabulary and click on 'Manage Fields'. Under 'Add new field' 
    - add a label, 
    - change the machine name to 'field_ol_style', 
    - select 'Long text' as field type, and
    - select 'Text area (multiple rows)' as widget  
On the next page, add a help text like:  
`{"circle": {"radius": 5}, "fill": {"colour": "rgba(255,255,255,0.4)"}, "stroke": {"colour": "#3399CC", "width": 1.25}}`
3. Add keyword group  
All terms in the vocabulary which sit directly under root are keyword groups. These terms cannot be choosen to be assigned to a feature but are used to group keywords together.
4. Add keywords
To add a keyword, create a new term 1 level under a keyword group.
