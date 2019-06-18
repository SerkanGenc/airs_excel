// Everytime we visit the matched url (https://stars.bilkent.edu.tr/airs/index.php?do=advs), 
// the following js code executes by chrome.
console.log("Started");
let all = [] ;

window.addEventListener("load", function() {

    // In Advisee page, it collects all students 
    let captions = document.querySelectorAll("span[tip='Curriculum'] a") ;
    let caps = Array.from(captions)    ;
    let urls = caps.map( item => {
        // find his/her "id"
        let id = (item.href.split("=")[2]).split("&")[0];
        // build url to retrieve her curriculum
        return "/airs/index.php?do=webservices-redirect&id=" + id + "&service=curriculum&modul=A" ;
    });

    Promise.all( urls.map(u => fetch(u).then(result=> result.text())))
           .then(texts => {
            // All async results are available
            for ( let text of texts) {
                // html to DOM for easy parsing
                let page = document.createElement("html");
                page.innerHTML = text ;
                processStudent(page);
            }

            // sort students based on their lastname
            all.sort((a,b) => a.fullname.localeCompare(b.fullname, "tr")) ;
                
            // find all courses and their names in the curriculum.
            let keys = all[0].courses.map(item => {
                return { code: item.code, name : item.name}
            });

            // For each course, add the students' grades with their name.
            let last = keys.map((course,idx) => {
                all.forEach(function(std){
                    course[std.fullname] = std.courses[idx].grade ;
                });
                return course;
            });
      
            // "last" is array of courses containing students' grades.
            // convet array into xls. (it actually returns html with .xls extension)
            const xls = new XlsExport(last, 'Grades');
            xls.exportToXLS('grades_1.xls') ;
        });
});

// Parsing incoming html curriculum data
function processStudent(page) {
    let curr = [] ;
    // Find user name and lastname from incoming result (html)
    let lastname = $(".row2:first td:eq(1)", page).html();
    let name = $(".row1:first td:eq(1)", page).html();

    // Find all tables for semesters. All semester tables have caption with h3 tag starting with "Fall or Spring"
    $("caption h3", page)
    .filter( function(i) {
        return $(this).html().match(/^(Fall|Spring)/) ;
    })
    .each(function(i) {
        // for each semester, access course rows.
        $("tr:gt(0)",$(this).parent().parent()).each(function(i){
            // for each course, add into curr(iculum) array of the student
            let code = $("td:first", $(this)).html();
            let name = $("td:eq(1)", $(this)).html();
            let status = $("td:eq(2)", $(this)).html();
            let grade = $("td:eq(3)", $(this)).html().replace(/&nbsp;/g, "");
            let taken = $("td:eq(6)", $(this)).html().replace(/&nbsp;/g, "").replace("<br>","");
            curr.push({
                code, name, status, grade, taken
            });
        }); 
    });
 
    // If a course has an empty grade, check out if the student took that course before
    // It fills with F,FX,FZ or W instead of blank.
    for ( let i=0; i < curr.length; i++) {

        if ( curr[i].status == "Not graded") {
            curr[i].grade = "X" ;
        } else 
        if ( curr[i].code == "" && curr[i].name == "") {
            if ( curr[i-1].grade == "") {
                curr[i-1].grade = curr[i].grade ;
            }
        }
    }

    // Delete rows that represent previous taken courses
    let courses = curr.filter(item => item.code != "" || item.name != "") ;
 
    // Add student fullname and her courses/grades into "all" array.
    all.push({
        "fullname" : lastname + " " + name,
        "courses" : courses
    });
}